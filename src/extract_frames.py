import cv2
import os

def extract_frames(video_path, output_dir, interval=5):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    cap = cv2.VideoCapture(video_path)
    count = 0
    saved_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        if count % interval == 0:
            saved_count += 1
            frame_name = f"frame_{saved_count:05d}.jpg"
            cv2.imwrite(os.path.join(output_dir, frame_name), frame)
        
        count += 1
        
    cap.release()
    print(f"Total frames processed: {count}")
    print(f"Total frames saved to {output_dir}: {saved_count}")
    return saved_count

if __name__ == "__main__":
    extract_frames("videos/input.mp4", "videos/frames", interval=5)
