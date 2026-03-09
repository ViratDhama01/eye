import os
import torch
import torch.nn as nn
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
from sklearn.metrics import cohen_kappa_score, confusion_matrix, accuracy_score
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
import pandas as pd
from dataset_loader import ben_graham_preprocessing

# --- CONFIGURATION ---
MODEL_PATH = 'archive_best_model.pth'
NUM_CLASSES = 5
BATCH_SIZE = 32
DEVICE = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

ARCHIVE_TEST_DIR = "data/archive/augmented_resized_V2/test"
APTOS_CSV = "data/aptos/train.csv"
APTOS_IMAGES_DIR = "data/aptos/train_images"

# --- HELPER FUNCTIONS ---
def load_model(path, num_classes):
    model = models.efficientnet_b0(weights=None)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    model.load_state_dict(torch.load(path, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    return model

def evaluate(model, dataloader, device):
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for inputs, labels in dataloader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            
    acc = accuracy_score(all_labels, all_preds)
    qwk = cohen_kappa_score(all_labels, all_preds, weights='quadratic')
    cm = confusion_matrix(all_labels, all_preds)
    return acc, qwk, cm

def plot_confusion_matrix(cm, classes, title, filename):
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=classes, yticklabels=classes)
    plt.title(title)
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.savefig(filename)
    plt.close()

# --- Grad-CAM FUNCTION ---
def generate_gradcam(model, image_path, target_layer, device, save_path):
    # Prepare image
    # We use Ben Graham's preprocessing as in training
    image_np = ben_graham_preprocessing(image_path)
    # Convert to normal (0-1) for Grad-CAM visualization
    rgb_img = image_np.astype(np.float32) / 255.0
    
    # Transformations for model
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    input_tensor = transform(Image.fromarray(image_np)).unsqueeze(0).to(device)
    
    # Initialize Grad-CAM
    cam = GradCAM(model=model, target_layers=[target_layer])
    
    # Determine predicted class for target
    with torch.no_grad():
        output = model(input_tensor)
        _, target_category = torch.max(output, 1)
        target_category = target_category.item()
        
    targets = [ClassifierOutputTarget(target_category)]
    
    # Generate heatmap
    grayscale_cam = cam(input_tensor=input_tensor, targets=targets)
    grayscale_cam = grayscale_cam[0, :]
    
    # Combine heatmap with original image
    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
    
    # Save
    Image.fromarray(visualization).save(save_path)
    print(f"Grad-CAM saved to {save_path} (Predicted Class: {target_category})")

# --- APTOS Custom Dataset ---
class APTOSDataset(torch.utils.data.Dataset):
    def __init__(self, csv_file, img_dir, transform=None):
        self.df = pd.read_csv(csv_file)
        self.img_dir = img_dir
        self.transform = transform
        
    def __len__(self):
        return len(self.df)
        
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_id = row['id_code']
        label = row['diagnosis']
        
        img_path = os.path.join(self.img_dir, f"{img_id}.png")
        if not os.path.exists(img_path):
            img_path = os.path.join(self.img_dir, f"{img_id}.jpg")
            
        img_np = ben_graham_preprocessing(img_path)
        img_pil = Image.fromarray(img_np)
        
        if self.transform:
            img_pil = self.transform(img_pil)
            
        return img_pil, torch.tensor(label, dtype=torch.long)

def main():
    print(f"Loading best model from {MODEL_PATH}...")
    model = load_model(MODEL_PATH, NUM_CLASSES)
    
    test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    # 1. Evaluate on Archive Test Set
    if os.path.exists(ARCHIVE_TEST_DIR):
        print("\nEvaluating on ARCHIVE Test Set...")
        archive_test_set = datasets.ImageFolder(ARCHIVE_TEST_DIR, transform=test_transform)
        archive_test_loader = DataLoader(archive_test_set, batch_size=BATCH_SIZE, shuffle=False)
        
        acc, qwk, cm = evaluate(model, archive_test_loader, DEVICE)
        print(f"Archive Test Accuracy: {acc:.4f}")
        print(f"Archive Test QWK: {qwk:.4f}")
        plot_confusion_matrix(cm, archive_test_set.classes, "Archive Test Confusion Matrix", "archive_cm.png")
    else:
        print(f"\nWarning: Archive test dir not found at {ARCHIVE_TEST_DIR}")
        
    # 2. Evaluate on APTOS Set (Generalization)
    if os.path.exists(APTOS_CSV) and os.path.isdir(APTOS_IMAGES_DIR):
        print("\nEvaluating on APTOS (Generalization Test)...")
        aptos_test_set = APTOSDataset(APTOS_CSV, APTOS_IMAGES_DIR, transform=test_transform)
        aptos_test_loader = DataLoader(aptos_test_set, batch_size=BATCH_SIZE, shuffle=False)
        
        acc, qwk, cm = evaluate(model, aptos_test_loader, DEVICE)
        print(f"APTOS Generalization Accuracy: {acc:.4f}")
        print(f"APTOS Generalization QWK: {qwk:.4f}")
        plot_confusion_matrix(cm, [str(i) for i in range(5)], "APTOS Generalization CM", "aptos_cm.png")
    else:
        print(f"\nWarning: APTOS CSV or images not found.")
        
    # 3. Generate Grad-CAM for a few samples
    # For EfficientNet_b0, the last convolutional layer is model.features[-1]
    target_layer = model.features[-1]
    
    # Pick a few sample images from the archive test set if available
    print("\nGenerating Grad-CAM visualizations...")
    samples = []
    if os.path.exists(ARCHIVE_TEST_DIR):
        for class_dir in os.listdir(ARCHIVE_TEST_DIR):
            if os.path.isdir(os.path.join(ARCHIVE_TEST_DIR, class_dir)):
                for img_file in os.listdir(os.path.join(ARCHIVE_TEST_DIR, class_dir)):
                    if img_file.endswith(".jpg") or img_file.endswith(".png"):
                        samples.append(os.path.join(ARCHIVE_TEST_DIR, class_dir, img_file))
                        break
    
    # Also pick one from APTOS
    if os.path.isdir(APTOS_IMAGES_DIR):
        for img_file in os.listdir(APTOS_IMAGES_DIR):
             if img_file.endswith(".jpg") or img_file.endswith(".png"):
                samples.append(os.path.join(APTOS_IMAGES_DIR, img_file))
                break
                
    for i, sample_path in enumerate(samples[:5]):
        name = os.path.basename(sample_path).split('.')[0]
        generate_gradcam(model, sample_path, target_layer, DEVICE, f"gradcam_{i}_{name}.png")

if __name__ == "__main__":
    main()
