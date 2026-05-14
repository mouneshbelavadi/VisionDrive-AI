from ultralytics import YOLO
import numpy as np

class ObjectTracker:
    def __init__(self):
        self.model = YOLO('yolov8n.pt')
        self.tracks = {} # track_id -> list of (cx, cy)
        
    def update(self, frame):
        results = self.model.track(frame, persist=True, verbose=False)
        
        current_frame_tracks = {}
        ready_tracks = {}
        
        if results[0].boxes.id is not None:
            boxes = results[0].boxes.xywh.cpu().numpy()
            ids = results[0].boxes.id.int().cpu().numpy()
            
            for box, track_id in zip(boxes, ids):
                cx, cy, w, h = box
                
                if track_id not in self.tracks:
                    self.tracks[track_id] = []
                
                self.tracks[track_id].append((cx, cy))
                
                # Keep only last 4 positions
                if len(self.tracks[track_id]) > 4:
                    self.tracks[track_id].pop(0)
                
                current_frame_tracks[track_id] = (cx, cy)
                
                # If we have 4 frames, it's ready for prediction
                if len(self.tracks[track_id]) == 4:
                    ready_tracks[track_id] = np.array(self.tracks[track_id])
                    
        return current_frame_tracks, ready_tracks, len(current_frame_tracks)
