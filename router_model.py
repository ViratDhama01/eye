import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os

class EyeRouter(nn.Module):
    def __init__(self):
        super(EyeRouter, self).__init__()
        # Use a very small efficientnet for fast routing
        self.base_model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        # 3 Classes: 0: RETINA, 1: ANTERIOR (External Eye), 2: INVALID (Not an eye)
        self.base_model.classifier[1] = nn.Linear(self.base_model.classifier[1].in_features, 3)

    def forward(self, x):
        return self.base_model(x)

def predict_eye_type(image, model, device):
    """
    Returns: 'RETINA', 'ANTERIOR', or 'INVALID'
    """
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    input_tensor = transform(image).unsqueeze(0).to(device)
    
    with torch.no_grad():
        outputs = model(input_tensor)
        _, preds = torch.max(outputs, 1)
        class_idx = preds.item()
        
    classes = {0: "RETINA", 1: "ANTERIOR", 2: "INVALID"}
    return classes.get(class_idx, "INVALID")

# In a real scenario, we'd train this model here on a mixed dataset.
# But for the immediate deployment integration, we will replace the heuristic.
