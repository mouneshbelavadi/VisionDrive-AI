import cv2
import os
import sys
import numpy as np
import torch
import base64
import json
import asyncio
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import time

# Add paths for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '../src/ps2_segmentation'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../src/ps3_bev'))
sys.path.append(os.path.join(os.path.dirname(__file__), '../src/ps1_trajectory'))

from infer import segment_frame
from occupancy import detect_objects
from ipm import IPMTransformer
from tracker import ObjectTracker
from predict import load_model, predict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "online", "message": "Bharat Perception API", "endpoints": ["/predict", "/ws/live"]}

# Global models
print("Backend: Loading models...")
tracker = ObjectTracker()
ipm_instance = None
traj_model = None
model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/traj_model.pth'))
if os.path.exists(model_path):
    traj_model = load_model(model_path)
    print(f"Loaded trajectory model from {model_path}")

def process_frame(frame_bgr):
    global ipm_instance
    if frame_bgr is None:
        return {"error": "Invalid frame provided"}
        
    if ipm_instance is None:
        ipm_instance = IPMTransformer(frame_bgr.shape)
        
    t_start = time.time()
    
    # Stage 1: Segmentation
    mask, overlay, conf = segment_frame(frame_bgr)
    
    # Stage 2: BEV & Detections
    dets, obj_count = detect_objects(frame_bgr)
    
    # Draw detections on overlay for tracking visualization
    for (x, y, w, h) in dets:
        # Convert coordinates to int for OpenCV drawing
        ix, iy, iw, ih = int(x), int(y), int(w), int(h)
        cv2.rectangle(overlay, (ix, iy), (ix+iw, iy+ih), (0, 255, 255), 2)
        cv2.putText(overlay, "OBJ", (ix, iy-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
    
    # Build proper BEV display grid
    bev_display = np.zeros((300, 300, 3), dtype=np.uint8)

    # Step 1: Draw free drivable space in dark green
    bev_mask = ipm_instance.warp_mask(mask)
    bev_display[bev_mask == 1] = [0, 60, 30]

    # Step 2: Draw road center line
    cv2.line(bev_display, (150, 300), (150, 0), (0, 80, 40), 2)

    # Step 3: Draw grid lines
    for i in range(0, 300, 30):
        cv2.line(bev_display, (i, 0), (i, 300), (10, 25, 15), 1)
        cv2.line(bev_display, (0, i), (300, i), (10, 25, 15), 1)

    # Step 4: Project detected objects onto BEV
    obj_bev_positions = []
    for (x1, y1, w, h) in dets:
        cx_img = x1 + w // 2
        by_img = y1 + h
        pt = np.float32([[[float(cx_img), float(by_img)]]])
        try:
            bev_pt = cv2.perspectiveTransform(pt, ipm_instance.M)[0][0]
            bx, by2 = int(bev_pt[0]), int(bev_pt[1])
            if 0 <= bx < 300 and 0 <= by2 < 300:
                obj_bev_positions.append([bx, by2])
                # Draw object as orange box on BEV
                cv2.rectangle(bev_display, (bx-10, by2-7), (bx+10, by2+7), (26, 107, 255), -1) # Orange in BGR
                cv2.rectangle(bev_display, (bx-10, by2-7), (bx+10, by2+7), (255, 255, 255), 1)
        except:
            continue

    # Step 5: Draw Ego Vehicle
    cv2.rectangle(bev_display, (140, 270), (160, 290), (255, 245, 0), -1) # Cyan in BGR
    cv2.rectangle(bev_display, (140, 270), (160, 290), (255, 255, 255), 1)
    
    # Stage 3: Trajectory
    trajectories = []
    current, ready, _ = tracker.update(frame_bgr)
    
    # We want to show both current tracked objects and ready trajectories
    for tid in ready:
        if traj_model:
            path = predict(traj_model, ready[tid])
            trajectories.append(path.tolist())
    
    # Print progress to terminal for visibility
    print(f"Processed frame: {obj_count} objects, {len(trajectories)} trajectories ready.")
            
    # Danger & Proximity Detection
    # Ego vehicle is at roughly (150, 280) in BEV (300x300)
    is_danger = obj_count > 4 # High object density
    
    for (bx, by2) in obj_bev_positions:
        # Distance to ego (rough Euclidean in pixel space)
        dist = np.sqrt((bx - 150)**2 + (by2 - 280)**2)
        
        # If object is directly in front (center lane) and close
        if 120 < bx < 180 and by2 > 200:
            is_danger = True
            break
        
        # If object is very close regardless of lane
        if dist < 60:
            is_danger = True
            break

    # Base64 Conversions
    _, mask_buffer = cv2.imencode('.jpg', overlay)
    mask_b64 = base64.b64encode(mask_buffer).decode('utf-8')
    
    _, bev_buffer = cv2.imencode('.jpg', bev_display)
    bev_b64 = base64.b64encode(bev_buffer).decode('utf-8')
    
    fps = 1.0 / (time.time() - t_start)

    
    return {
        "mask_b64": mask_b64,
        "bev_b64": bev_b64,
        "bev_positions": obj_bev_positions,
        "trajectory": trajectories,
        "obj_count": obj_count,
        "confidence": conf,
        "is_danger": is_danger,
        "fps": round(fps, 1)
    }


@app.post("/predict")
async def predict_route(file: UploadFile = File(...)):
    filename = file.filename.lower()
    contents = await file.read()
    
    if filename.endswith(('.mp4', '.avi', '.mov', '.mkv')):
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        cap = cv2.VideoCapture(temp_path)
        # Scan first 50 frames for most dangerous moment
        best_result = None
        max_objs = -1
        for _ in range(50):
            ret, frame = cap.read()
            if not ret: break
            res = process_frame(frame)
            if res.get("obj_count", 0) > max_objs:
                max_objs = res["obj_count"]
                best_result = res
        cap.release()
        os.remove(temp_path)
        return best_result or {"error": "Could not process video"}
        
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return process_frame(frame)

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
            result = process_frame(frame)
            await websocket.send_json(result)
            await asyncio.sleep(0.01)
    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        cap.release()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

