import cv2
import numpy as np
from ultralytics import YOLO
from ipm import IPMTransformer
import os

# Load YOLOv8 nano
try:
    model = YOLO('yolov8n.pt')
except Exception as e:
    print(f"Error loading YOLO: {e}")
    model = None

def detect_objects(frame_bgr):
    if model is None:
        return [], 0
        
    results = model(frame_bgr, verbose=False)
    boxes = results[0].boxes
    
    # Classes: 0=person, 1=bicycle, 2=car, 3=motorbike, 5=bus, 7=truck
    allowed_classes = [0, 1, 2, 3, 5, 7]
    detections = []
    
    for box in boxes:
        cls = int(box.cls[0])
        if cls in allowed_classes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append((x1, y1, x2-x1, y2-y1))
            
    return detections, len(detections)

def generate_bev(frame_bgr, mask):
    ipm = IPMTransformer(frame_bgr.shape)
    
    # Detect objects
    dets, count = detect_objects(frame_bgr)
    
    # Warp mask
    bev_mask = ipm.warp_mask(mask)
    
    # Build grid
    occ_grid = ipm.build_occupancy_grid(bev_mask, dets)
    
    # Colorize
    # occ_grid is binary (0/1), convert to 0-255 for colormap
    occ_grid_scaled = (occ_grid * 255).astype(np.uint8)
    bev_color = cv2.applyColorMap(occ_grid_scaled, cv2.COLORMAP_VIRIDIS)
    
    return bev_color

if __name__ == "__main__":
    # Test on one frame if available
    frame_path = "videos/frames/frame_00001.jpg"
    if os.path.exists(frame_path):
        frame = cv2.imread(frame_path)
        # Dummy mask (bottom half)
        h, w = frame.shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)
        mask[int(h*0.55):, :] = 1
        
        bev = generate_bev(frame, mask)
        cv2.imwrite("outputs/bev/test_bev.jpg", bev)
        print("BEV output saved to outputs/bev/test_bev.jpg")
    else:
        print("No test frame found at", frame_path)
