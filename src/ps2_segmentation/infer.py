import torch
import torchvision.transforms as T
from torchvision.models.segmentation import deeplabv3_resnet50, DeepLabV3_ResNet50_Weights
import numpy as np
import cv2

# Use GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# # Load model (Commented out to save RAM on Render)
# model = deeplabv3_resnet50(weights=DeepLabV3_ResNet50_Weights.DEFAULT).to(device)
# model.eval()


# Transforms
preprocess = T.Compose([
    T.ToPILImage(),
    T.Resize(520),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def segment_frame(frame_bgr):
    h, w = frame_bgr.shape[:2]
    
    # Preprocess
    input_tensor = preprocess(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(device)
    
    # with torch.no_grad():
    #     output = model(input_tensor)['out'][0]

    
    # Heuristic: Mark lower 45% of frame as drivable (as per user request)
    # Actually, the user asked for a "simple heuristic" for road mask: mark lower 45% of frame.
    # But usually DeepLab would provide the mask. The user says: 
    # "Road mask: mark lower 45% of frame as drivable (simple heuristic)"
    # This implies I should use the heuristic instead of or in addition to DeepLab? 
    # Or maybe the user wants the model to run but then apply the heuristic?
    # I'll combine them: use DeepLab for road (class 15 in COCO is person, class 0 is background? 
    # Actually, road isn't a standard COCO class in DeepLabV3+ ResNet50 trained on COCO. 
    # It's usually Pascal VOC or Cityscapes. The torchvision weights are COCO/VOC.
    # Road isn't in Pascal VOC (20 classes).
    # So the heuristic is necessary.
    
    mask = np.zeros((h, w), dtype=np.uint8)
    mask[int(h * 0.55):, :] = 1 # Lower 45%
    
    # Overlay
    overlay = frame_bgr.copy()
    green_layer = np.zeros_like(frame_bgr)
    green_layer[:, :] = [0, 255, 0]
    
    # Blend 50/50 where mask is 1
    overlay = cv2.addWeighted(overlay, 0.5, cv2.bitwise_and(green_layer, green_layer, mask=mask), 0.5, 0)
    
    # Confidence (fraction of road pixels)
    confidence = float(np.sum(mask) / (h * w))
    
    return mask, overlay, confidence
