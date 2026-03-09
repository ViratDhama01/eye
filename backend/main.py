import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
import io
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
from dataset_loader import ben_graham_preprocessing

# Try importing ollama — it may not be available in cloud deployment
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

app = FastAPI()

# CORS — allow configured origins or all for development
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
# Model paths — check same directory first, then parent directory
def find_model(name):
    if os.path.exists(name):
        return name
    parent = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), name)
    if os.path.exists(parent):
        return parent
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), name)

MODEL_RETINA_PATH = find_model("archive_best_model.pth")
MODEL_GENERAL_PATH = find_model("anterior_model.pth")

# Use CPU for cloud deployment (MPS is Mac-only)
DEVICE = torch.device("cpu")
if torch.backends.mps.is_available():
    DEVICE = torch.device("mps")

CLASSES_RETINA = {
    0: "No DR", 1: "Mild DR", 2: "Moderate DR", 3: "Severe DR", 4: "Proliferative DR"
}

CLASSES_GENERAL = {
    0: 'Central Serous Chorioretinopathy', 1: 'Diabetic Retinopathy', 2: 'Disc Edema',
    3: 'Glaucoma', 4: 'Healthy', 5: 'Macular Scar', 6: 'Myopia', 7: 'Pterygium',
    8: 'Retinal Detachment', 9: 'Retinitis Pigmentosa'
}

# --- MODEL LOADING ---
def load_model(path, num_classes):
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    if os.path.exists(path):
        model.load_state_dict(torch.load(path, map_location=DEVICE))
    else:
        print(f"WARNING: Model file not found at {path}")
    model.to(DEVICE)
    model.eval()
    return model

retina_model = load_model(MODEL_RETINA_PATH, 5)
general_model = load_model(MODEL_GENERAL_PATH, 10)

# --- PREDICTION LOGIC ---
def preprocess_image(image: Image.Image):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0).to(DEVICE)

def check_eye_type(image):
    img_array = np.array(image)
    if img_array.ndim == 2: return "RETINA"
    r = img_array[:,:,0].mean()
    g = img_array[:,:,1].mean()
    b = img_array[:,:,2].mean()
    return "RETINA" if r > (g + b) * 0.9 else "ANTERIOR"

# --- Health check ---
@app.get("/")
async def health_check():
    return {"status": "ok", "service": "OcuSight AI Backend"}

# --- API ENDPOINTS ---
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert('RGB')
    
    # Check eye type
    eye_type = check_eye_type(image)
    
    # Choose model
    model = retina_model if eye_type == "RETINA" else general_model
    classes = CLASSES_RETINA if eye_type == "RETINA" else CLASSES_GENERAL
    
    # Inference
    input_tensor = preprocess_image(image)
    with torch.no_grad():
        outputs = model(input_tensor)
        probs = torch.nn.functional.softmax(outputs, dim=1)[0]
        top_prob, top_class = probs.topk(1)
        
    result = {
        "diagnosis": classes[top_class.item()],
        "confidence": round(top_prob.item() * 100, 2),
        "eye_type": eye_type,
        "probabilities": [round(float(p), 4) for p in probs.cpu().numpy()]
    }
    
    # Grad-CAM Heatmap
    target_layer = model.features[-1]
    cam = GradCAM(model=model, target_layers=[target_layer])
    targets = [ClassifierOutputTarget(top_class.item())]
    
    image_np = np.array(image.resize((224, 224)))
    rgb_img = image_np.astype(np.float32) / 255.0
    grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0, :]
    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
    
    buffered = io.BytesIO()
    Image.fromarray(visualization).save(buffered, format="PNG")
    heatmap_base64 = base64.b64encode(buffered.getvalue()).decode()
    
    result["heatmap"] = f"data:image/png;base64,{heatmap_base64}"
        
    return result

@app.post("/report")
async def generate_report(file: UploadFile = File(...), diagnosis: str = "Unknown", eye_type: str = "RETINA"):
    if not OLLAMA_AVAILABLE:
        return {"report": "AI Report generation requires Ollama (LLaVA model) which is not available in this deployment. Please run locally for full report generation."}
    
    contents = await file.read()
    
    if eye_type == "RETINA":
        prompt = (
            f"You are an expert Ophthalmologist analyzing a retinal fundus scan. "
            f"The AI classifier has diagnosed this patient with: **{diagnosis}**. "
            "Please provide a **comprehensive clinical report** analyzing this image. "
            "Structure your report with these sections:\n"
            "1. **Diagnosis Summary** - Confirm the AI finding\n"
            "2. **Detected Retinal Features** - Mention Microaneurysms, Hemorrhages, Exudates, Neovascularization\n"
            "3. **Risk Assessment** - Severity and progression risk\n"
            "4. **Recommended Action** - Clinical next steps\n"
            "Keep it professional and concise."
        )
    else:
        prompt = (
            f"You are an expert Ophthalmologist analyzing an external eye photo. "
            f"The AI classifier has diagnosed this patient with: **{diagnosis}**. "
            "Please describe the visible symptoms and provide a clinical recommendation."
        )
    
    try:
        response = ollama.generate(model='llava:latest', prompt=prompt, images=[contents])
        return {"report": response['response']}
    except Exception as e:
        return {"report": f"Dr. AI is currently unavailable. Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
