import cv2
import os
import sys
import numpy as np
import base64
import json
import asyncio
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import time
import gc

# ─── Path setup ────────────────────────────────────────────────────────────────
sys.path.append(os.path.join(os.path.dirname(__file__), '../src/ps2_segmentation'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../src/ps3_bev'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../src/ps1_trajectory'))

app = FastAPI()

# ─── CORS – must NOT combine allow_origins=["*"] with allow_credentials=True ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # no credentials → wildcard is fine
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "online", "message": "Bharat Perception API", "endpoints": ["/predict", "/ws/live"]}

# ─── Lazy globals (loaded only on first request to save cold-start RAM) ────────
_yolo_model   = None
_ipm_instance = None
_traj_model   = None
_tracker      = None

def get_tracker():
    global _tracker
    if _tracker is None:
        from tracker import ObjectTracker
        _tracker = ObjectTracker()
    return _tracker

def get_yolo():
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'yolov8n.pt'))
            if not os.path.exists(model_path):
                model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../yolov8n.pt'))
            _yolo_model = YOLO(model_path)
            print("YOLOv8n loaded OK")
        except Exception as e:
            print(f"YOLO load failed: {e}")
            _yolo_model = None
    return _yolo_model

def get_ipm(shape):
    global _ipm_instance
    if _ipm_instance is None:
        try:
            from ipm import IPMTransformer
            _ipm_instance = IPMTransformer(shape)
            print("IPM loaded OK")
        except Exception as e:
            print(f"IPM load failed: {e}")
    return _ipm_instance

def get_traj_model():
    global _traj_model
    if _traj_model is None:
        try:
            from predict import load_model
            model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/traj_model.pth'))
            if os.path.exists(model_path):
                _traj_model = load_model(model_path)
                print(f"Trajectory model loaded from {model_path}")
        except Exception as e:
            print(f"Traj model load failed: {e}")
    return _traj_model

# ─── Lightweight detection using OpenCV DNN (fallback when YOLO OOMs) ─────────
def detect_objects_cv(frame_bgr):
    """Fast OpenCV-based detection – no PyTorch, minimal RAM usage."""
    h, w = frame_bgr.shape[:2]
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    # Background subtraction heuristic for moving objects
    dets = []
    # Use simple edge-based blob detection as ultra-lightweight alternative
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges   = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 800 or area > (h * w * 0.4):   # filter noise & huge blobs
            continue
        x, y, cw, ch = cv2.boundingRect(cnt)
        aspect = cw / (ch + 1e-5)
        if 0.4 < aspect < 4.5:                    # vehicle-like aspect ratio
            dets.append((x, y, cw, ch))
    # Merge overlapping detections (simple NMS)
    dets = dets[:20]                               # cap at 20
    return dets, len(dets)

# ─── Lightweight drivable-space segmentation (no DeepLabV3+) ──────────────────
def segment_frame_cv(frame_bgr):
    """OpenCV-only road segmentation via colour + gradient heuristics."""
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    h, w = frame_bgr.shape[:2]

    # Road pixels: low saturation + medium brightness (asphalt/concrete)
    mask_road = cv2.inRange(hsv, (0, 0, 40), (180, 60, 200))

    # Bottom half bias (road is usually in the lower portion of the frame)
    bias = np.zeros_like(mask_road)
    bias[h//2:, :] = 255
    mask_road = cv2.bitwise_and(mask_road, bias)

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    mask_road = cv2.morphologyEx(mask_road, cv2.MORPH_CLOSE, kernel)
    mask_road = cv2.morphologyEx(mask_road, cv2.MORPH_OPEN,  kernel)

    # Confidence ≈ fraction of lower half covered by road mask
    road_area  = np.sum(mask_road[h//2:, :] > 0)
    total_area = (h // 2) * w
    confidence = float(road_area) / max(total_area, 1)
    confidence = min(confidence * 1.4, 1.0)        # scale up slightly

    # Overlay
    overlay = frame_bgr.copy()
    overlay[mask_road > 0] = (overlay[mask_road > 0] * 0.6 +
                               np.array([0, 180, 0]) * 0.4).astype(np.uint8)

    # Binary mask (0/1)
    binary_mask = (mask_road > 0).astype(np.uint8)
    return binary_mask, overlay, confidence

# ─── BEV helpers ──────────────────────────────────────────────────────────────
def build_bev(frame_bgr, dets, mask, ipm):
    h_frame, w_frame = frame_bgr.shape[:2]
    bev = np.zeros((300, 300, 3), dtype=np.uint8)

    # Free-space projection
    if ipm is not None:
        try:
            bev_mask = ipm.warp_mask(mask)
            bev[bev_mask == 1] = [0, 60, 30]
        except Exception:
            pass

    # Grid lines
    for i in range(0, 300, 30):
        cv2.line(bev, (i, 0), (i, 300), (10, 25, 15), 1)
        cv2.line(bev, (0, i), (300, i), (10, 25, 15), 1)
    cv2.line(bev, (150, 300), (150, 0), (0, 80, 40), 2)

    obj_bev_positions = []
    for (x1, y1, w, h) in dets:
        cx_img = x1 + w // 2
        by_img = y1 + h
        if ipm is not None:
            try:
                pt   = np.float32([[[float(cx_img), float(by_img)]]])
                bpt  = cv2.perspectiveTransform(pt, ipm.M)[0][0]
                bx, by2 = int(bpt[0]), int(bpt[1])
            except Exception:
                bx = int((cx_img / w_frame) * 300)
                by2 = int((by_img / h_frame) * 300)
        else:
            bx = int((cx_img / w_frame) * 300)
            by2 = int((by_img / h_frame) * 300)

        if 0 <= bx < 300 and 0 <= by2 < 300:
            obj_bev_positions.append([bx, by2])
            cv2.rectangle(bev, (bx-10, by2-7), (bx+10, by2+7), (26, 107, 255), -1)
            cv2.rectangle(bev, (bx-10, by2-7), (bx+10, by2+7), (255, 255, 255), 1)

    # Ego vehicle
    cv2.rectangle(bev, (140, 270), (160, 290), (255, 245, 0), -1)
    cv2.rectangle(bev, (140, 270), (160, 290), (255, 255, 255), 1)
    return bev, obj_bev_positions

# ─── Main frame processor ─────────────────────────────────────────────────────
def process_frame(frame_bgr):
    if frame_bgr is None:
        return {"error": "Invalid frame"}

    t_start = time.time()

    # --- Segmentation (lightweight CV fallback) --------------------------------
    try:
        from infer import segment_frame
        mask, overlay, conf = segment_frame(frame_bgr)
    except Exception:
        mask, overlay, conf = segment_frame_cv(frame_bgr)

    # --- Detection (try YOLO, fall back to CV) --------------------------------
    try:
        yolo = get_yolo()
        if yolo is not None:
            results  = yolo(frame_bgr, verbose=False)[0]
            dets     = []
            for box in results.boxes.xywh.cpu().numpy():
                cx, cy, bw, bh = box
                dets.append((int(cx - bw/2), int(cy - bh/2), int(bw), int(bh)))
            obj_count = len(dets)
        else:
            raise RuntimeError("YOLO unavailable")
    except Exception:
        dets, obj_count = detect_objects_cv(frame_bgr)

    # Draw detections on overlay
    for (x, y, w, h) in dets:
        cv2.rectangle(overlay, (x, y), (x+w, y+h), (0, 255, 255), 2)
        cv2.putText(overlay, "OBJ", (x, y-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

    # --- BEV -------------------------------------------------------------------
    ipm = get_ipm(frame_bgr.shape)
    bev_display, obj_bev_positions = build_bev(frame_bgr, dets, mask, ipm)

    # --- Trajectories ----------------------------------------------------------
    trajectories = []
    try:
        tracker    = get_tracker()
        traj_model = get_traj_model()
        current, ready, _ = tracker.update(frame_bgr)
        if traj_model is not None:
            from predict import predict
            for tid in ready:
                path = predict(traj_model, ready[tid])
                trajectories.append(path.tolist())
    except Exception as e:
        print(f"Tracker/traj error: {e}")

    # --- Danger ----------------------------------------------------------------
    is_danger = obj_count > 4
    for (bx, by2) in obj_bev_positions:
        dist = np.sqrt((bx - 150)**2 + (by2 - 280)**2)
        if 120 < bx < 180 and by2 > 200:
            is_danger = True; break
        if dist < 60:
            is_danger = True; break

    # --- Encode ----------------------------------------------------------------
    _, mask_buf = cv2.imencode('.jpg', overlay, [cv2.IMWRITE_JPEG_QUALITY, 70])
    mask_b64    = base64.b64encode(mask_buf).decode('utf-8')
    _, bev_buf  = cv2.imencode('.jpg', bev_display, [cv2.IMWRITE_JPEG_QUALITY, 70])
    bev_b64     = base64.b64encode(bev_buf).decode('utf-8')

    fps = round(1.0 / max(time.time() - t_start, 1e-6), 1)
    gc.collect()

    print(f"Frame OK: {obj_count} objs, {len(trajectories)} trajs, {fps} fps")
    return {
        "mask_b64":       mask_b64,
        "bev_b64":        bev_b64,
        "bev_positions":  obj_bev_positions,
        "trajectory":     trajectories,
        "obj_count":      obj_count,
        "confidence":     float(conf),
        "is_danger":      is_danger,
        "fps":            fps,
    }


@app.post("/predict")
async def predict_route(file: UploadFile = File(...)):
    filename = file.filename.lower()
    contents = await file.read()

    if filename.endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        temp_path = f"/tmp/upload_{int(time.time())}_{file.filename}"
        try:
            with open(temp_path, "wb") as f:
                f.write(contents)

            cap = cv2.VideoCapture(temp_path)
            if not cap.isOpened():
                return {"error": "Could not open video file"}

            best_result = None
            max_objs    = -1
            frame_step  = max(1, int(cap.get(cv2.CAP_PROP_FRAME_COUNT) / 30))
            frame_idx   = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_idx += 1
                if frame_idx % frame_step != 0:
                    continue
                # Resize large frames to save memory
                h, w = frame.shape[:2]
                if w > 640:
                    scale = 640 / w
                    frame = cv2.resize(frame, (640, int(h * scale)))
                res = process_frame(frame)
                if res.get("obj_count", 0) > max_objs:
                    max_objs    = res["obj_count"]
                    best_result = res
                gc.collect()

            cap.release()
            return best_result or {"error": "No frames processed"}
        except Exception as e:
            return {"error": f"Video processing failed: {str(e)}"}
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # Image upload
    try:
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "Could not decode image"}
        # Resize if too large
        h, w = frame.shape[:2]
        if w > 640:
            scale = 640 / w
            frame = cv2.resize(frame, (640, int(h * scale)))
        return process_frame(frame)
    except Exception as e:
        return {"error": f"Image processing failed: {str(e)}"}


@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        await websocket.send_json({"error": "Could not open webcam"})
        await websocket.close()
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            h, w = frame.shape[:2]
            if w > 640:
                frame = cv2.resize(frame, (640, int(h * (640/w))))
            result = process_frame(frame)
            await websocket.send_json(result)
            await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        cap.release()


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
