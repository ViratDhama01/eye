import streamlit as st
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np
import time
import requests
from streamlit_lottie import st_lottie
import ollama

# --- CONFIGURATION ---
MODEL_RETINA_PATH = "best_model.pth"       # The Specialist (5 Classes)
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

# --- ANIMATION LOADER ---
def load_lottieurl(url):
    try:
        r = requests.get(url)
        if r.status_code != 200: return None
        return r.json()
    except: return None

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
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, 10) # 10 Classes
    try:
        # Check if model plain exists first to avoid error
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
    """
    Calculates severity index (0-4) and risk percentage.
    Only valid for 5-class Retina model.
    """
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
            "Look for and describe specific features such as:\n"
            "- Microaneurysms\n"
            "- Hemorrhages (Dot/Blot/Flame)\n"
            "- Hard/Soft Exudates\n"
            "- Cotton Wool Spots\n"
            "- Macular Edema\n"
            "- Neovascularization\n"
            "Explain WHY the image matches the diagnosis. Be detailed and professional."
        )
    else:
        prompt = (
            f"You are an expert Ophthalmologist analyzing an external eye photo. "
            f"The AI classifier has diagnosed this patient with: **{diagnosis}**. "
            "Please provide a **detailed analysis** of the visible symptoms in this image. "
            "Describe the condition of the sclera, iris, pupil, and eyelids. "
            "Explain the visual signs that support this diagnosis."
        )
    
    try:
        response = ollama.generate(
            model='llava:7b', 
            prompt=prompt,
            images=[image_bytes] # Sending the actual image now!
        )
        return response['response']
    except:
        return "Dr. Llava is taking a break (Ollama connection failed)."

def verify_is_eye(image_bytes):
    """
    Uses VLM to check if the image is actually an eye.
    """
    # Ask for a description instead of Yes/No (Llava is better at describing)
    prompt = "Describe this image briefly. What body part is this?"
    try:
        response = ollama.generate(
            model='llava:7b',
            prompt=prompt,
            images=[image_bytes]
        )
        answer = response['response'].lower()
        
        # Check for medical/eye keywords
        valid_keywords = ["eye", "retina", "fundus", "iris", "pupil", "ophthalmology", "optic", "macula", "sclera", "vision", "face"]
        
        if any(word in answer for word in valid_keywords):
            return True
            
        print(f"DEBUG: Image rejected. Model saw: {answer}") # Term log for debugging
        return False
    except Exception as e:
        print(f"DEBUG: Verification failed due to error: {e}")
        # If Ollama is offline or fails to generate, we DEFAULT TO ALLOW to not break the app.
        # But we log it.
        return True

# --- PREDICTION LOGIC ---
def predict(image, mode):
    # Preprocessing
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

# --- STREAMLIT UI ---
st.set_page_config(page_title="Eye AI", page_icon="👁️", layout="wide")

# Hide generic streamlit style and fix Theme support
st.markdown("""
<style>
    /* Remove hardcoded backgrounds to allow Streamlit's native Dark/Light mode to work */
    /* .stApp { background-color: #0e1117; color: white; } <-- REMOVED */
    
    /* Modern Button Style (Adaptive) */
    div.stButton > button { 
        background-color: #ff4b4b; 
        color: white; 
        border-radius: 12px; 
        width: 100%; 
        border: none; 
        padding: 12px 20px;
        font-weight: 600;
        transition: all 0.3s ease;
    }
    div.stButton > button:hover { 
        background-color: #ff6b6b; 
        box-shadow: 0 4px 12px rgba(255, 75, 75, 0.3);
        transform: translateY(-2px);
    }
    
    /* Custom Progress Bar for Risk Score */
    .risk-bar-container {
        background-color: var(--secondary-background-color);
        border-radius: 8px; 
        height: 24px; 
        width: 100%;
        overflow: hidden;
    }
    .risk-bar-fill {
        height: 100%; 
        border-radius: 8px;
        transition: width 0.5s ease-in-out;
    }
</style>
""", unsafe_allow_html=True)

# Header
lottie_eye = load_lottieurl("https://assets5.lottiefiles.com/packages/lf20_5njp3vgg.json")
col1, col2 = st.columns([1, 4])
with col1:
    if lottie_eye: st_lottie(lottie_eye, height=100)
with col2:
    st.title("Ocular Disease Diagnostic System")
    st.markdown("**Hybrid-Architecture: Retina Specialist (EfficientNet) + Anterior Generalist**")

# Sidebar
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/3063/3063822.png", width=60)
    st.title("RetinaAI")
    st.header("Patient Data")
    uploaded_file = st.file_uploader("Upload Eye Scan or Selfie", type=["jpg", "png", "jpeg"])
    st.markdown("---")
    st.caption(f"Device: {device}")

# Main Area
if uploaded_file:
    # Need bytes for Ollama validation
    file_bytes = uploaded_file.getvalue()
    image = Image.open(uploaded_file).convert('RGB')
    
    c1, c2 = st.columns([1, 1])
    with c1:
        st.image(image, caption="Uploaded Scan", use_container_width=True)
    
    with c2:
        st.subheader("Analysis Dashboard")
        
        analyze_button = st.button("Run AI Diagnosis", use_container_width=True)

        if analyze_button:
            with st.spinner("Verifying Image Content..."):
                is_eye = verify_is_eye(file_bytes)
                
            if not is_eye:
                st.error("🚨 ALERT: This does not appear to be an eye photo.")
                st.write("Please upload a valid **Retinal Scan** or **Anterior Eye Photo**.")
            else:
                # 1. Router Check
                eye_type = check_eye_type(image)
                
                # Display Mode
                if eye_type == "RETINA":
                    st.info("🔎 Detected: **Retinal Fundus Scan** (Using Specialist Brain)")
                else:
                    st.success("📸 Detected: **External Eye / Selfie** (Using Generalist Brain)")
                
                with st.spinner("Processing on Apple M4 Neural Engine..."):
                    # Animation
                    if lottie_eye:
                        with st.empty():
                            st_lottie(lottie_eye, height=150, key="scanning")
                            time.sleep(1.5)
                    
                    # Get Result
                    diagnosis, confidence, all_probs = predict(image, eye_type)
                    
                    # --- RESULTS DISPLAY ---
                    
                    # Layout based on type
                    if eye_type == "RETINA":
                        severity_index, risk_pct = calculate_risk_score(all_probs)
                        
                        r_col1, r_col2, r_col3, r_col4 = st.columns(4)
                        with r_col1: st.metric("Diagnosis", diagnosis)
                        with r_col2: st.metric("Confidence", f"{confidence:.2f}%")
                        with r_col3: st.metric("Severity Index", f"{severity_index:.2f} / 4.0")
                        with r_col4:
                            st.write("Risk Score")
                            bar_color = "#ff4b4b" if risk_pct > 50 else "#00cc96"
                            # Use CSS class defined above + inline dynamic style
                            st.markdown(f"""
                            <div class="risk-bar-container">
                                <div class="risk-bar-fill" style="width: {risk_pct}%; background-color: {bar_color};"></div>
                            </div>
                            <div style="text-align: right; font-size: 0.8em; margin-top: 5px;">{risk_pct:.1f}%</div>
                            """, unsafe_allow_html=True)
                            
                    else: # Anterior
                        r_col1, r_col2 = st.columns(2)
                        with r_col1: st.metric("Diagnosis", diagnosis)
                        with r_col2: st.metric("Confidence", f"{confidence:.2f}%")
                    
                    st.markdown("---")
                    
                    # Chart
                    st.write("### Class Probabilities")
                    if eye_type == "RETINA":
                        chart_data = {name: prob for name, prob in zip(CLASSES_RETINA.values(), all_probs)}
                    else:
                        chart_data = {name: prob for name, prob in zip(CLASSES_GENERAL.values(), all_probs)}
                    st.bar_chart(chart_data)
                    
                    # AI Findings
                    st.write("### 🤖 Dr. AI Findings")
                    if confidence > 30: # Low threshold for demo
                        with st.spinner("Consulting Dr. AI (Llava) for full analysis..."):
                            explanation = get_ollama_explanation(diagnosis, eye_type, file_bytes)
                            st.info(explanation)
                    else:
                         st.warning(f"Confidence ({confidence:.1f}%) is too low for a reliable generative explanation.")
            
            # Disclaimer (Always visible at the bottom of analysis)
            if 'is_eye' in locals() and is_eye:
                 st.warning("⚠️ DISCLAIMER: This is an AI research tool. Results are generated by a deep learning model (EfficientNet) and are for experimental purposes only. This tool is NOT a substitute for professional medical diagnosis. Always consult a certified Ophthalmologist.")
        
        # Disclaimer (Always visible at the bottom of analysis)
        st.warning("⚠️ DISCLAIMER: This is an AI research tool. Results are generated by a deep learning model (EfficientNet) and are for experimental purposes only. This tool is NOT a substitute for professional medical diagnosis. Always consult a certified Ophthalmologist.")

else:
    with col2:
        st.info("Please upload an image to begin.")
