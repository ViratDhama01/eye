import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import ollama
import numpy as np
import cv2

# Import preprocessing from our loader to ensure consistency
# Ensure dataset_loader.py is in the same directory
try:
    from dataset_loader import ben_graham_preprocessing
except ImportError:
    print("Error: dataset_loader.py not found. Please run this script from the project root.")
    exit(1)

# --- Configuration ---
TEST_IMAGE_PATH = "./data/aptos/train_images/000c1434d8d7.png" # Default test image
MODEL_PATH = "best_model.pth"
DEVICE = torch.device("mps") if torch.backends.mps.is_available() else torch.device("cpu")
CLASS_NAMES = {
    0: "No_DR",
    1: "Mild",
    2: "Moderate",
    3: "Severe",
    4: "Proliferative_DR"
}

def load_inference_model(model_path, num_classes=5):
    print(f"Loading model from {model_path} to {DEVICE}...")
    # Re-instantiate architecture
    model = models.efficientnet_b0(weights=None) # No need to download pretrained weights again if loading full state
    # However, if we saved state_dict of a pretrained model, we usually need the base structure.
    # The user said "weights=True" in training. 
    # Best practice for inference loading: Instantiate structure -> Modify Head -> Load State Dict.
    
    # Note: If the saved model was DataParallel or slightly different, this might need adjustment.
    # Based on train_model.py, we saved model.state_dict().
    
    # Modify head
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    
    # Load weights
    if not os.path.exists(model_path):
        print(f"Error: Model file '{model_path}' not found.")
        exit(1)
        
    state_dict = torch.load(model_path, map_location=DEVICE, weights_only=True)
    model.load_state_dict(state_dict)
    
    model.to(DEVICE)
    model.eval()
    return model

def predict_image(model, image_path):
    # 1. Preprocess (Ben Graham) - returns numpy array (224, 224, 3)
    processed_img_np = ben_graham_preprocessing(image_path)
    
    # 2. Transform (ToTensor, Normalize)
    # Convert to PIL for transforms as used in training
    img_pil = Image.fromarray(processed_img_np)
    
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    img_tensor = transform(img_pil).unsqueeze(0) # Add batch dimension: [1, 3, 224, 224]
    img_tensor = img_tensor.to(DEVICE)
    
    # 3. Inference
    with torch.no_grad():
        outputs = model(img_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        confidence, predicted_class = torch.max(probabilities, 1)
        
    return predicted_class.item(), confidence.item()

def get_visual_explanation(image_path, diagnosis_name):
    print("\n--- contacting Dr. Llava (Ollama) ---")
    prompt = (
        f"You are an ophthalmologist. The technical diagnosis is {diagnosis_name}. "
        "Describe the fundus image features that support this, such as hemorrhages, "
        "microaneurysms, or cotton wool spots. Be concise."
    )
    
    try:
        response = ollama.generate(
            model='llava:7b',
            prompt=prompt,
            images=[image_path] # Ollama takes path or bytes
        )
        return response['response']
    except Exception as e:
        return f"Error connecting to Ollama: {e}. Is 'ollama serve' running and 'llava:7b' pulled?"

def main():
    print("--- Diabetic Retinopathy AI Diagnostic Tool ---")
    print(f"Hardware Acceleration: {DEVICE}")
    
    # Use a local variable to handle logical path
    final_image_path = TEST_IMAGE_PATH
    
    print(f"Analyzing Image: {final_image_path}")
    
    if not os.path.exists(final_image_path):
        print("Error: Test image not found.")
        # Try to find *any* png in the folder to be helpful
        data_dir = os.path.dirname(final_image_path)
        if os.path.exists(data_dir):
            files = [f for f in os.listdir(data_dir) if f.endswith('.png')]
            if files:
                print(f"Found {files[0]} instead. Using that.")
                final_image_path = os.path.join(data_dir, files[0])
            else:
                return
        else:
            return

    # Load Model
    model = load_inference_model(MODEL_PATH)
    
    # Predict
    class_idx, confidence = predict_image(model, final_image_path)
    diagnosis = CLASS_NAMES[class_idx]
    confidence_pct = confidence * 100
    
    print("\n" + "="*40)
    print("     AI TECHNICAL DIAGNOSIS")
    print("="*40)
    print(f"Class Code: {class_idx}")
    print(f"Diagnosis:  {diagnosis}")
    print(f"Confidence: {confidence_pct:.2f}%")
    print("="*40)
    
    # Hybrid Loop
    if confidence > 0.50:
        print(f"\nConfidence ({confidence_pct:.1f}%) > 50%. Requesting visual explanation...")
        explanation = get_visual_explanation(final_image_path, diagnosis)
        
        print("\n" + "="*40)
        print("     VISUAL EXPLANATION (VLM)")
        print("="*40)
        print(explanation)
        print("="*40)
    else:
        print("\nConfidence is low. Visual explanation skipped.")

if __name__ == "__main__":
    main()
