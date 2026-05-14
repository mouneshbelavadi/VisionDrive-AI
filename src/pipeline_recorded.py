import cv2
import os
import time
import sys
import numpy as np
import torch

# Add paths for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'ps2_segmentation'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'ps3_bev'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'ps1_trajectory'))

from infer import segment_frame
from occupancy import detect_objects
from ipm import IPMTransformer
from tracker import ObjectTracker
from predict import load_model, predict

def run_pipeline(video_path, limit=100):
    # Load Models
    print("Loading models...")
    tracker = ObjectTracker()
    ipm = None
    traj_model = None
    if os.path.exists("models/traj_model.pth"):
        traj_model = load_model("models/traj_model.pth")
    
    cap = cv2.VideoCapture(video_path)
    count = 0
    
    # Folders
    os.makedirs("outputs/masks", exist_ok=True)
    os.makedirs("outputs/bev", exist_ok=True)
    
    while cap.isOpened() and count < limit:
        t_start = time.time()
        ret, frame = cap.read()
        if not ret:
            break
            
        if ipm is None:
            ipm = IPMTransformer(frame.shape)
            
        # Stage 1: Segmentation
        mask, overlay, conf = segment_frame(frame)
        
        # Stage 2: BEV & Detections
        dets, obj_count = detect_objects(frame)
        bev_mask = ipm.warp_mask(mask)
        occ_grid = ipm.build_occupancy_grid(bev_mask, dets)
        
        # Colorize BEV
        occ_grid_scaled = (occ_grid * 255).astype(np.uint8)
        bev_color = cv2.applyColorMap(occ_grid_scaled, cv2.COLORMAP_VIRIDIS)
        
        # Stage 3: Trajectory
        current, ready, _ = tracker.update(frame)
        for tid in ready:
            if traj_model:
                path = predict(traj_model, ready[tid])
                # Draw on BEV (transform points to BEV if needed, 
                # but here we assume path is in some coord system)
                # For demo, just draw a yellow line on BEV if path points are valid
                # We need to project these points to BEV.
                # Assuming path is in camera coords, transform to BEV:
                path_bev = []
                for pt in path:
                    pt_reshaped = np.float32(pt).reshape(-1, 1, 2)
                    p_bev = cv2.perspectiveTransform(pt_reshaped, ipm.M)
                    path_bev.append(p_bev[0][0])
                
                path_bev = np.array(path_bev, dtype=np.int32)
                cv2.polylines(bev_color, [path_bev], False, (0, 255, 255), 2)
        
        # Stats & UI
        fps = 1.0 / (time.time() - t_start)
        stats_text = f"FPS: {fps:.1f} | Objects: {obj_count} | Conf: {conf:.2f}"
        cv2.putText(overlay, stats_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Save
        cv2.imwrite(f"outputs/masks/frame_{count:05d}.jpg", overlay)
        cv2.imwrite(f"outputs/bev/frame_{count:05d}.jpg", bev_color)
        
        count += 1
        if count % 20 == 0:
            print(f"Frame {count}: {stats_text}")
            
    cap.release()
    print(f"Pipeline complete. Processed {count} frames.")

if __name__ == "__main__":
    run_pipeline("videos/input.mp4", limit=100)
