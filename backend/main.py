import os
import sys

# PyInstaller bundle detection — when frozen, _MEIPASS points to temp extraction dir
if getattr(sys, 'frozen', False):
    _BUNDLE_DIR = sys._MEIPASS
    os.chdir(_BUNDLE_DIR)
else:
    _BUNDLE_DIR = os.path.dirname(os.path.abspath(__file__))

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

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIF_SUPPORT = True
except ImportError:
    HEIF_SUPPORT = False

from database import create_db_and_tables, get_session, Patient, ScanRecord
from contextlib import asynccontextmanager
from sqlmodel import Session, select
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends

# Try importing ollama — it may not be available in cloud deployment
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

# CORS — allow configured origins or all for development
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:8000", # for testing
]
env_origins = os.environ.get("ALLOWED_ORIGINS")
if env_origins:
    ALLOWED_ORIGINS.extend(env_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if "*" not in ALLOWED_ORIGINS else ["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler to ensure JSON response even on crashes
from fastapi.responses import JSONResponse
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    print(f"GLOBAL ERROR: {str(exc)}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
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
# --- AI ROUTER MODEL (Instead of Heursitic) ---
def load_router_model():
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 3)
    # We load it from an expected path. If it doesn't exist yet (training pending),
    # we initialize it randomly but this sets up the final architecture.
    try:
        model.load_state_dict(torch.load("router_model.pth", map_location=DEVICE))
    except:
        print("WARNING: router_model.pth not found. Initialized with default weights.")
    model.to(DEVICE)
    model.eval()
    return model

router_model = load_router_model()

def check_eye_type(image):
    """
    0 = RETINA, 1 = ANTERIOR, 2 = INVALID
    Returns 'RETINA' or 'ANTERIOR' (defaults to fallback if invalid to show error in UI later)
    """
    input_tensor = preprocess_image(image)
    with torch.no_grad():
        outputs = router_model(input_tensor)
        _, preds = torch.max(outputs, 1)
        
    class_idx = preds.item()
    if class_idx == 1:
        return "ANTERIOR"
    return "RETINA" # Default to retina for 0 or 2 for now, until UI handles INVALID

# --- Health check ---
@app.get("/")
async def health_check():
    return {"status": "ok", "service": "OcuSight AI Backend"}

# --- API ENDPOINTS ---
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        print(f"Received file: {file.filename}, Size: {len(contents)} bytes")
        
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
            
        try:
            image = Image.open(io.BytesIO(contents)).convert('RGB')
        except Exception as e:
            print(f"PIL Error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unknown error in /predict: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
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
    
    # 1. Overlay (Heatmap over Original)
    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
    buffered_overlay = io.BytesIO()
    Image.fromarray(visualization).save(buffered_overlay, format="PNG")
    overlay_base64 = base64.b64encode(buffered_overlay.getvalue()).decode()
    
    # 2. Pure Heatmap
    pure_heatmap = show_cam_on_image(np.zeros_like(rgb_img), grayscale_cam, use_rgb=True)
    buffered_heatmap = io.BytesIO()
    Image.fromarray(pure_heatmap).save(buffered_heatmap, format="PNG")
    heatmap_base64 = base64.b64encode(buffered_heatmap.getvalue()).decode()
    
    result["heatmap"] = f"data:image/png;base64,{heatmap_base64}"
    result["overlay"] = f"data:image/png;base64,{overlay_base64}"
        
    return result

@app.post("/report")
async def generate_report(file: UploadFile = File(...), diagnosis: str = "Unknown", eye_type: str = "RETINA"):
    if not OLLAMA_AVAILABLE:
        return {"report": "AI Report generation requires Ollama (LLaVA model) which is not available in this deployment. Please run locally for full report generation."}
    
    contents = await file.read()
    
    import json
    
    if eye_type == "RETINA":
        prompt = (
            f"You are a world-class Ophthalmologist and Retina Specialist analyzing a retinal fundus scan. "
            f"The AI classifier has diagnosed this patient with: **{diagnosis}**. "
            "Respond ONLY with a valid JSON object matching this exact structure. Do NOT include any markdown formatting, backticks, or extra text. "
            "Ensure your medical analysis is HIGHLY DETAILED, using professional clinical terminology. "
            "CRITICAL: For 'features' and 'recommended_action', provide a list of clear, point-wise clinical notes. Each point should be a concise but thorough sentence.\n"
            "{\n"
            '  "summary": "A detailed clinical summary of the AI finding and its immediate medical implications.",\n'
            '  "features": ["Point 1: Detailed description of specific retinal biomarker observed.", "Point 2: Secondary clinical observation...", "Point 3: Topographic distribution assessment..."],\n'
            '  "risk_assessment": "A professional paragraph evaluating severity and progression risk.",\n'
            '  "recommended_action": ["Action 1: Specific clinical procedure or next step.", "Action 2: Follow-up timeline.", "Action 3: Lifestyle or monitoring advice."]\n'
            "}\n"
        )
    else:
        prompt = (
            f"You are a world-class Ophthalmologist analyzing an external eye photo. "
            f"The AI classifier has diagnosed this patient with: **{diagnosis}**. "
            "Respond ONLY with a valid JSON object matching this exact structure. Do NOT include markdown or backticks. "
            "Ensure your medical analysis is professional and detailed. Provide list items as point-wise clinical notes.\n"
            "{\n"
            '  "summary": "A detailed clinical summary confirming the AI finding and discussing the condition.",\n'
            '  "features": ["Symptom 1: Detailed observation from the photo", "Symptom 2: Clinical significance"],\n'
            '  "risk_assessment": "A comprehensive paragraph evaluating the severity and timeline of progression risk.",\n'
            '  "recommended_action": ["Action 1: Specific clinical action", "Action 2: Follow-up plan", "Action 3: Patient advice"]\n'
            "}\n"
        )
    
    try:
        # Try llama3.2-vision first as it's more stable for these types of images
        response = ollama.generate(model='llama3.2-vision:latest', prompt=prompt, images=[contents])
        raw_text = response['response'].strip()
        
        # Robustly extract JSON block
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            json_str = raw_text[start_idx:end_idx+1]
            try:
                structured_data = json.loads(json_str)
                return {"structured_report": True, "report": structured_data}
            except Exception as e:
                pass
                
        # Fallback if model refuses to return valid JSON or we can't parse it
        return {"structured_report": False, "report": raw_text}

    except Exception as e:
        try:
            # Fallback to general vision model
            response = ollama.generate(model='llava:latest', prompt=prompt, images=[contents])
            return {"structured_report": False, "report": response['response']}
        except Exception as e2:
            return {"structured_report": False, "report": "Dr. AI clinical reporting is currently unavailable due to unexpected resource constraints on the AI provider."}

# --- PATIENT ENDPOINTS ---
@app.post("/patients/")
async def create_patient(patient: Patient, session: Session = Depends(get_session)):
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient

@app.get("/patients/")
async def list_patients(session: Session = Depends(get_session)):
    patients = session.exec(select(Patient)).all()
    return patients

@app.get("/patients/{patient_id}")
async def get_patient(patient_id: int, session: Session = Depends(get_session)):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    scans = session.exec(select(ScanRecord).where(ScanRecord.patient_id == patient_id)).all()
    return {"patient": patient, "scans": scans}

@app.post("/patients/{patient_id}/scans")
async def add_scan(patient_id: int, scan: ScanRecord, session: Session = Depends(get_session)):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    scan.patient_id = patient_id
    session.add(scan)
    session.commit()
    session.refresh(scan)
    return scan

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
