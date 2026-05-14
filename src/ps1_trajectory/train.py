import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import os
from tracker import ObjectTracker
from model import SocialLSTM
import cv2

def collect_tracks(video_path, max_frames=300):
    tracker = ObjectTracker()
    cap = cv2.VideoCapture(video_path)
    count = 0
    all_ready_tracks = []
    
    print("Collecting tracks from video...")
    while cap.isOpened() and count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        
        _, ready, _ = tracker.update(frame)
        for tid in ready:
            all_ready_tracks.append(ready[tid])
            
        count += 1
        if count % 50 == 0:
            print(f"Processed {count} frames...")
            
    cap.release()
    return all_ready_tracks

def train():
    tracks = collect_tracks("videos/input.mp4")
    
    if len(tracks) < 20:
        print(f"Warning: Only {len(tracks)} tracks collected. Using synthetic data.")
        # Synthetic data: [N, 4, 2]
        num_synthetic = 500
        hist = np.random.randn(num_synthetic, 4, 2).astype(np.float32)
    else:
        hist = np.array(tracks).astype(np.float32)
        
    # Use hist as both input and target (pseudo-future for training demonstration)
    # Target should be [N, 6, 2], so we'll just repeat/pad hist for demo
    # In reality, you'd need ground truth futures.
    target = np.zeros((hist.shape[0], 6, 2), dtype=np.float32)
    target[:, :4, :] = hist
    target[:, 4:, :] = hist[:, -1:, :] # Repeat last pos
    
    dataset = TensorDataset(torch.from_numpy(hist), torch.from_numpy(target))
    loader = DataLoader(dataset, batch_size=32, shuffle=True)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SocialLSTM().to(device)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.MSELoss()
    
    print("Starting training...")
    for epoch in range(25):
        total_loss = 0
        for batch_hist, batch_target in loader:
            batch_hist, batch_target = batch_hist.to(device), batch_target.to(device)
            
            optimizer.zero_grad()
            modes, conf = model(batch_hist)
            
            # Best-of-N loss: find mode with lowest MSE vs target
            # batch_target: [B, 6, 2]
            # modes: [B, 3, 6, 2]
            
            losses = []
            for m in range(3):
                losses.append(torch.mean((modes[:, m] - batch_target)**2, dim=(1,2)))
            
            losses = torch.stack(losses, dim=1) # [B, 3]
            min_loss, min_idx = torch.min(losses, dim=1)
            
            # Weight loss by confidence (simplified)
            loss = torch.mean(min_loss)
            
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        if (epoch + 1) % 5 == 0:
            print(f"Epoch {epoch+1}/25, Loss: {total_loss/len(loader):.4f}")
            
    if not os.path.exists("models"):
        os.makedirs("models")
    torch.save(model.state_dict(), "models/traj_model.pth")
    print("Model saved to models/traj_model.pth")

if __name__ == "__main__":
    train()
