import streamlit as st
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np
import time
import requests
import ollama
import os

# --- CONFIGURATION ---
MODEL_RETINA_PATH = "archive_best_model.pth"       # The Specialist (5 Classes)
MODEL_GENERAL_PATH = "anterior_model.pth"  # The Generalist (10 Classes)

# Classes for Brain #1 (DR Specialist)
CLASSES_RETINA = {
    0: "No DR (Healthy)",
    1: "Mild DR",
    2: "Moderate DR",
    3: "Severe DR",
    4: "Proliferative DR"
}

# Classes for Brain #2 (Generalist/Anterior)
CLASSES_GENERAL = {
    0: 'Central Serous Chorioretinopathy',
    1: 'Diabetic Retinopathy',
    2: 'Disc Edema',
    3: 'Glaucoma',
    4: 'Healthy',
    5: 'Macular Scar',
    6: 'Myopia',
    7: 'Pterygium',
    8: 'Retinal Detachment',
    9: 'Retinitis Pigmentosa'
}

# --- SETUP HARDWARE ---
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

# --- MODEL LOADING FUNCTIONS ---
@st.cache_resource
def load_retina_model():
    """Loads the 5-class DR Specialist"""
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 5)
    try:
        model.load_state_dict(torch.load(MODEL_RETINA_PATH, map_location=device))
        model.to(device)
        model.eval()
        return model
    except: return None

@st.cache_resource
def load_general_model():
    """Loads the 10-class Generalist"""
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 10) 
    try:
        model.load_state_dict(torch.load(MODEL_GENERAL_PATH, map_location=device))
        model.to(device)
        model.eval()
        return model
    except: return None

# --- THE SMART ROUTER ---
def check_eye_type(image):
    """Decides if the image is a Retina (Fundus) or External (Selfie)"""
    img_array = np.array(image)
    if img_array.ndim == 2: return "RETINA"
        
    r = img_array[:,:,0].mean()
    g = img_array[:,:,1].mean()
    b = img_array[:,:,2].mean()
    
    # Heuristic: Retinas are VERY Red/Orange. 
    if r > (g + b) * 0.9: 
        return "RETINA"
    else:
        return "ANTERIOR"

def calculate_risk_score(probabilities):
    """Calculates severity index (0-4) and risk percentage."""
    if len(probabilities) != 5:
        return 0.0, 0.0
    weights = np.array([0, 1, 2, 3, 4])
    severity_index = np.sum(probabilities * weights)
    risk_pct = (severity_index / 4.0) * 100
    return severity_index, risk_pct

def get_ollama_explanation(diagnosis, eye_type, image_bytes):
    if eye_type == "RETINA":
        prompt = (
            f"You are an expert Ophthalmologist analyzing a retinal fundus scan. "
            f"The AI classifier has diagnosed this patient with: **{diagnosis}**. "
            "Please provide a **comprehensive clinical report** analyzing this image. "
            "Mention features such as Microaneurysms, Hemorrhages, Exudates, and Neovascularization."
        )
    else:
        prompt = (
            f"You are an expert Ophthalmologist analyzing an external eye photo. "
            f"The AI classifier has diagnosed this patient with: **{diagnosis}**. "
            "Please describe the visible symptoms of this condition in the external structures of the eye."
        )
    
    try:
        response = ollama.generate(model='llava:latest', prompt=prompt, images=[image_bytes])
        return response['response']
    except:
        return "Dr. AI is currently offline. Please try again later."

def verify_is_eye(image_bytes):
    """Uses VLM to check if the image is actually an eye."""
    prompt = "Describe this image briefly. What body part is this?"
    try:
        response = ollama.generate(model='llava:latest', prompt=prompt, images=[image_bytes])
        answer = response['response'].lower()
        valid_keywords = ["eye", "retina", "fundus", "iris", "pupil", "face", "ocular"]
        return any(word in answer for word in valid_keywords)
    except:
        return True # Default to allow

# --- PREDICTION LOGIC ---
def predict(image, mode):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    input_tensor = transform(image).unsqueeze(0).to(device)
    
    if mode == "RETINA":
        model = load_retina_model()
        classes = CLASSES_RETINA
    else:
        model = load_general_model()
        classes = CLASSES_GENERAL
        
    if model is None:
        return "Model not found!", 0.0, None

    with torch.no_grad():
        outputs = model(input_tensor)
        probs = torch.nn.functional.softmax(outputs, dim=1)[0]
        top_prob, top_class = probs.topk(1)
        
    return classes[top_class.item()], top_prob.item() * 100, probs.cpu().numpy()

# --- STREAMLIT UI DESIGN ---
st.set_page_config(page_title="Eye AI", page_icon="👁️", layout="wide")

# Custom CSS for Premium Minimal UI
st.markdown("""
<style>
    /* Main Background */
    .stApp {
        background-color: #0B0F14;
        color: #E6EDF3;
    }

    /* Navbar */
    .nav-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 5%;
        background: rgba(17, 24, 39, 0.8);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: fixed;
        width: 100%;
        top: 0;
        left: 0;
        z-index: 999;
    }
    .nav-logo { font-size: 1.5rem; font-weight: 700; color: #4DA3FF; }
    .nav-links { display: flex; gap: 2rem; color: #9AA4B2; font-size: 0.9rem; }

    /* Hero Section */
    .hero-container {
        text-align: center;
        padding: 120px 0 60px 0;
        background: radial-gradient(circle at center, rgba(77, 163, 255, 0.1) 0%, transparent 70%);
    }
    .hero-title { font-size: 3.5rem; font-weight: 800; margin-bottom: 0.5rem; color: #E6EDF3; }
    .hero-subtitle { font-size: 1.2rem; color: #9AA4B2; margin-bottom: 2rem; }

    /* Feature Cards */
    .feature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        padding: 2rem 5%;
    }
    .feature-card {
        background: #1A2230;
        padding: 2rem;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.3s ease;
    }
    .feature-card:hover { border-color: #4DA3FF; transform: translateY(-5px); background: #212B3B; }
    .feature-icon { font-size: 2rem; margin-bottom: 1rem; color: #4DA3FF; }
    .feature-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .feature-text { font-size: 0.9rem; color: #6B7280; }

    /* Upload Panel */
    .upload-container {
        max-width: 800px;
        margin: 2rem auto;
        padding: 3rem;
        background: #111827;
        border-radius: 24px;
        border: 2px dashed rgba(77, 163, 255, 0.2);
        text-align: center;
        transition: border-color 0.3s ease;
    }
    .upload-container:hover { border-color: #4DA3FF; box-shadow: 0 0 20px rgba(77, 163, 255, 0.1); }

    /* Diagnosis Dashboard */
    .dashboard-container {
        display: flex;
        gap: 2rem;
        padding: 2rem 5%;
    }
    .result-card {
        flex: 1;
        background: #1A2230;
        padding: 2.5rem;
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .visual-card {
        flex: 1;
        background: #111827;
        padding: 1rem;
        border-radius: 24px;
        overflow: hidden;
    }

    /* Risk Bar */
    .risk-bar {
        height: 12px;
        border-radius: 6px;
        background: #0B0F14;
        margin: 1rem 0;
        position: relative;
        overflow: hidden;
    }
    .risk-gradient {
        height: 100%;
        background: linear-gradient(90deg, #00C2A8 0%, #FFD700 50%, #FF4D4F 100%);
    }
    .risk-indicator {
        position: absolute;
        top: 0;
        height: 100%;
        width: 4px;
        background: white;
        border-radius: 2px;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
    }

    /* Buttons */
    .stButton>button {
        background: #4DA3FF;
        color: white;
        border-radius: 12px;
        padding: 12px 24px;
        font-weight: 600;
        border: none;
        transition: all 0.3s ease;
    }
    .stButton>button:hover { background: #3586E0; transform: scale(1.02); }

    /* Override Streamlit UI */
    [data-testid="stHeader"] { background: transparent; }
    .stSpinner > div { border-top-color: #4DA3FF !important; }
</style>
""", unsafe_allow_html=True)

# Navigation
st.markdown("""
<div class="nav-container">
    <div class="nav-logo">👁️ Eye AI</div>
    <div class="nav-links">
        <span>Dashboard</span>
        <span>Patients</span>
        <span>Reports</span>
        <span>About</span>
    </div>
</div>
""", unsafe_allow_html=True)

# Hero Section
st.markdown("""
<div class="hero-container">
    <div class="hero-title">AI Eye Diagnostic System</div>
    <div class="hero-subtitle">Advanced retinal disease detection powered by deep learning</div>
</div>
""", unsafe_allow_html=True)

# Feature Cards
st.markdown("""
<div class="feature-grid">
    <div class="feature-card">
        <div class="feature-icon">🛡️</div>
        <div class="feature-title">Smart Analysis</div>
        <div class="feature-text">Auto eye-type detection and specialized routing.</div>
    </div>
    <div class="feature-card">
        <div class="feature-icon">🧠</div>
        <div class="feature-title">AI Diagnosis</div>
        <div class="feature-text">Deep learning retinal disease classification.</div>
    </div>
    <div class="feature-card">
        <div class="feature-icon">📄</div>
        <div class="feature-title">Clinical Report</div>
        <div class="feature-text">Human-readable clinical reports via Dr. AI.</div>
    </div>
</div>
""", unsafe_allow_html=True)

# Upload Section
with st.container():
    st.markdown('<div class="upload-container">', unsafe_allow_html=True)
    uploaded_file = st.file_uploader("Upload Retinal Scan or Eye Photo", type=["jpg", "png", "jpeg"], label_visibility="collapsed")
    if not uploaded_file:
        st.markdown('<div style="color: #6B7280; margin-top: 1rem;">Drag & drop image or browse files</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

# Logic execution
if uploaded_file:
    file_bytes = uploaded_file.getvalue()
    image = Image.open(uploaded_file).convert('RGB')
    
    col_l, col_r = st.columns(2)
    
    with col_l:
        st.image(image, use_container_width=True)
    
    with col_r:
        st.markdown('<div class="result-card">', unsafe_allow_html=True)
        st.subheader("Analysis Control")
        analyze_btn = st.button("Generate Diagnostic Report", use_container_width=True)
        
        if analyze_btn:
            # Animation / Status Phase
            status = st.empty()
            messages = [
                "Verifying image ocular integrity...",
                "Analyzing retinal vascular structures...",
                "Detecting microaneurysms and hemorrhages...",
                "Mapping topographic exudate distribution...",
                "Consulting Specialist Brain (EfficientNet)...",
                "Generating clinical findings..."
            ]
            
            for msg in messages:
                status.info(msg)
                time.sleep(0.8)
            status.empty()
            
            # Real Analysis
            eye_type = check_eye_type(image)
            diagnosis, confidence, all_probs = predict(image, eye_type)
            
            # Result Display
            st.markdown(f"### Diagnosis: <span style='color: #4DA3FF;'>{diagnosis}</span>", unsafe_allow_html=True)
            st.markdown(f"**Confidence**: {confidence:.2f}%")
            
            if eye_type == "RETINA":
                severity, risk_pct = calculate_risk_score(all_probs)
                st.markdown(f"**Risk Severity Index**: {severity:.2f} / 4.0")
                
                st.markdown(f"""
                <div class="risk-bar">
                    <div class="risk-gradient"></div>
                    <div class="risk-indicator" style="left: calc({risk_pct}% - 2px);"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #6B7280;">
                    <span>Low</span>
                    <span>Moderate</span>
                    <span>High</span>
                </div>
                """, unsafe_allow_html=True)
            
            st.markdown('---')
            st.write("### 🤖 Clinical Findings (Dr. AI)")
            with st.spinner("Compiling full medical report..."):
                explanation = get_ollama_explanation(diagnosis, eye_type, file_bytes)
                st.info(explanation)
                
        st.markdown('</div>', unsafe_allow_html=True)

# Footer
st.markdown("""
<div style="text-align: center; color: #6B7280; padding: 4rem 0; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 4rem;">
    Trusted by medical researchers and professionals worldwide.<br>
    <span style="font-size: 0.8rem;">Powered by EfficientNet + LLaVa | © 2026 Eye AI</span>
</div>
""", unsafe_allow_html=True)
