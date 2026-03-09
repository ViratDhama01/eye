import os
import cv2
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image
from sklearn.model_selection import train_test_split
from torchvision import transforms

def crop_image_from_gray(img, tol=7):
    """
    Crops the circle of the retina from the image, removing black borders.
    """
    if img.ndim == 2:
        mask = img > tol
        return img[np.ix_(mask.any(1), mask.any(0))]
    elif img.ndim == 3:
        gray_img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        mask = gray_img > tol
        check_shape = img[:, :, 0][np.ix_(mask.any(1), mask.any(0))].shape[0]
        if check_shape == 0:
            return img
        else:
            img1 = img[:, :, 0][np.ix_(mask.any(1), mask.any(0))]
            img2 = img[:, :, 1][np.ix_(mask.any(1), mask.any(0))]
            img3 = img[:, :, 2][np.ix_(mask.any(1), mask.any(0))]
            img = np.stack([img1, img2, img3], axis=-1)
        return img

def ben_graham_preprocessing(image_path, sigmaX=10):
    """
    Applies Ben Graham's preprocessing:
    1. Read image
    2. Crop black borders
    3. Resize to 224x224
    4. Gaussian Blur subtraction
    """
    try:
        image = cv2.imread(image_path)
        if image is None:
            # Create a black dummy image if load fails
            print(f"Warning: Could not load {image_path}, returning black image.")
            return np.zeros((224, 224, 3), dtype=np.uint8)
            
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = crop_image_from_gray(image)
        image = cv2.resize(image, (224, 224))
        
        # Gaussian Blur Subtraction
        # "weighted_add" method (Ben Graham's)
        # 4 * image - 4 * blur(image) + 128 (to keep it in 0-255 range essentially)
        image = cv2.addWeighted(image, 4, cv2.GaussianBlur(image, (0, 0), sigmaX), -4, 128)
        
        return image
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return np.zeros((224, 224, 3), dtype=np.uint8)

class DRDataset(Dataset):
    def __init__(self, df, image_dir, transform=None):
        self.df = df
        self.image_dir = image_dir
        self.transform = transform
        
    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_name = row['id_code']
        label = row['diagnosis']
        
        # Handle extensions - try png then jpg
        image_path = os.path.join(self.image_dir, f"{img_name}.png")
        if not os.path.exists(image_path):
            image_path = os.path.join(self.image_dir, f"{img_name}.jpg")
            
        # Apply Ben Graham Preprocessing
        # This returns a numpy array (H, W, C)
        image = ben_graham_preprocessing(image_path)
        
        # Convert to PIL for Torchvision Transforms
        image = Image.fromarray(image)
        
        if self.transform:
            image = self.transform(image)
            
        return image, torch.tensor(label, dtype=torch.long)

def get_data_loaders(csv_path, image_dir, batch_size=32, num_workers=4, test_size=0.2):
    """
    Reads CSV, splits into train/val, and returns DataLoaders.
    """
    df = pd.read_csv(csv_path)
    
    # Train/Val Split (Stratified to maintain class balance)
    train_df, val_df = train_test_split(
        df, test_size=test_size, stratify=df['diagnosis'], random_state=42
    )
    
    # Define Transforms (Resize is handled in preprocessing check, but good to ensure tensor conversion)
    # Since Ben Graham's processing outputs 224x224, we don't strictly need resizing here, 
    # but ToTensor and Normalize are essential.
    data_transforms = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_dataset = DRDataset(train_df, image_dir, transform=data_transforms)
    val_dataset = DRDataset(val_df, image_dir, transform=data_transforms)
    
    train_loader = DataLoader(
        train_dataset, 
        batch_size=batch_size, 
        shuffle=True, 
        num_workers=num_workers,
        pin_memory=False
    )
    
    val_loader = DataLoader(
        val_dataset, 
        batch_size=batch_size, 
        shuffle=False, 
        num_workers=num_workers,
        pin_memory=False
    )
    
    print(f"Training samples: {len(train_dataset)}")
    print(f"Validation samples: {len(val_dataset)}")
    
    return train_loader, val_loader

if __name__ == "__main__":
    # Test block to verify imports and logic syntax
    print("Testing dataset_loader.py imports and class definitions...")
    try:
        # Create dummy df and test split logic
        dummy_data = {
            'id_code': ['img1', 'img2', 'img3', 'img4', 'img5'],
            'diagnosis': [0, 1, 2, 3, 4]
        }
        df = pd.DataFrame(dummy_data)
        train_df, val_df = train_test_split(df, test_size=0.2, random_state=42)
        print("Dependencies and split logic verified.")
    except Exception as e:
        print(f"Verification failed: {e}")
