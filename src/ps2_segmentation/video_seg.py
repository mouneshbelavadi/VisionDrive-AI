import cv2
import os
import time
from infer import segment_frame

def process_video(video_path, output_dir, limit=50):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    cap = cv2.VideoCapture(video_path)
    count = 0
    start_time = time.time()
    
    while cap.isOpened() and count < limit:
        ret, frame = cap.read()
        if not ret:
            break
            
        mask, overlay, conf = segment_frame(frame)
        
        count += 1
        output_path = os.path.join(output_dir, f"frame_{count:05d}.jpg")
        cv2.imwrite(output_path, overlay)
        
        if count % 30 == 0:
            fps = count / (time.time() - start_time)
            print(f"Processed {count} frames... FPS: {fps:.2f}")
            
    cap.release()
    print(f"Finished processing {count} frames.")

if __name__ == "__main__":
    process_video("videos/input.mp4", "outputs/masks", limit=50)
