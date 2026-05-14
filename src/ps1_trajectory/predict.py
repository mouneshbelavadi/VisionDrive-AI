import torch
import numpy as np
from model import SocialLSTM

def load_model(model_path="models/traj_model.pth"):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SocialLSTM().to(device)
    if torch.cuda.is_available():
        model.load_state_dict(torch.load(model_path))
    else:
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    model.eval()
    return model

def predict(model, hist_array):
    # hist_array: [4, 2]
    device = next(model.parameters()).device
    input_tensor = torch.from_numpy(hist_array).float().unsqueeze(0).to(device)
    
    with torch.no_grad():
        modes, conf = model(input_tensor)
        
    # Get highest confidence mode
    best_idx = torch.argmax(conf[0])
    top_path = modes[0, best_idx].cpu().numpy()
    
    return top_path

def predict_all_modes(model, hist_array):
    device = next(model.parameters()).device
    input_tensor = torch.from_numpy(hist_array).float().unsqueeze(0).to(device)
    
    with torch.no_grad():
        modes, conf = model(input_tensor)
        
    # Sort modes by confidence
    conf_scores = conf[0].cpu().numpy()
    sorted_indices = np.argsort(conf_scores)[::-1]
    
    sorted_paths = []
    for idx in sorted_indices:
        sorted_paths.append(modes[0, idx].cpu().numpy())
        
    return sorted_paths
