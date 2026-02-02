import os
import time
import copy
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models
from sklearn.metrics import cohen_kappa_score
import numpy as np

# Import custom modules
from dataset_loader import get_data_loaders

def initialize_model(num_classes, feature_extract=False, use_pretrained=True):
    """
    Initializes EfficientNet_b0 or ResNet50.
    """
    # Using EfficientNet_b0 as it is efficient and powerful
    model = models.efficientnet_b0(weights='IMAGENET1K_V1' if use_pretrained else None)
    
    # Modify classifier
    # EfficientNet has 'classifier' block: Sequential(Dropout, Linear)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    
    return model

def train_model(model, dataloaders, criterion, optimizer, device, num_epochs=25, save_path='best_model.pth'):
    since = time.time()

    val_acc_history = []
    best_model_wts = copy.deepcopy(model.state_dict())
    best_loss = float('inf')
    best_kappa = -1.0

    for epoch in range(num_epochs):
        print(f'Epoch {epoch}/{num_epochs - 1}')
        print('-' * 10)

        # Each epoch has a training and validation phase
        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()  # Set model to training mode
            else:
                model.eval()   # Set model to evaluate mode

            running_loss = 0.0
            running_corrects = 0
            
            # For Kappa score calculation
            all_preds = []
            all_labels = []

            # Iterate over data.
            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                # Zero the parameter gradients
                optimizer.zero_grad()

                # Forward
                # Track history if only in train
                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    
                    _, preds = torch.max(outputs, 1)

                    # Backward + optimize only if in training phase
                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                # Statistics
                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)
                
                # Collect for Kappa calc
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

            epoch_loss = running_loss / len(dataloaders[phase].dataset)
            epoch_acc = running_corrects.float() / len(dataloaders[phase].dataset)
            
            # Calculate Kappa Score
            epoch_kappa = cohen_kappa_score(all_labels, all_preds, weights='quadratic')

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f} QWK: {epoch_kappa:.4f}')

            # Deep copy the model
            if phase == 'val':
                # Save best model based on LOSS (more stable than Kappa/Acc)
                if epoch_loss < best_loss:
                    best_loss = epoch_loss
                    best_kappa = epoch_kappa
                    best_model_wts = copy.deepcopy(model.state_dict())
                    torch.save(model.state_dict(), save_path)
                    print(f"New best model saved with Loss: {best_loss:.4f} and QWK: {best_kappa:.4f}")
                    
            val_acc_history.append(epoch_acc)

        print()

    time_elapsed = time.time() - since
    print(f'Training complete in {time_elapsed // 60:.0f}m {time_elapsed % 60:.0f}s')
    print(f'Best val Loss: {best_loss:.4f}')
    print(f'Best val QWK: {best_kappa:.4f}')

    # Load best model weights
    model.load_state_dict(best_model_wts)
    return model, val_acc_history

def main():
    # Configuration
    DATA_DIR = "./data/aptos/train_images" # Folder containing images
    CSV_PATH = "./data/aptos/train.csv"    # Path to CSV
    BATCH_SIZE = 16 # Adjust based on memory
    NUM_EPOCHS = 20
    NUM_CLASSES = 5
    LEARNING_RATE = 0.001
    
    # Check for MPS (Apple Silicon Acceleration)
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        print("Success: MPS (Metal Performance Shaders) is available! Using Apple Silicon GPU.")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        print("Using CUDA GPU.")
    else:
        device = torch.device("cpu")
        print("Warning: MPS/CUDA not available. Using CPU (will be slow).")

    # Initialize Model
    print("Initializing EfficientNet_b0...")
    model_ft = initialize_model(NUM_CLASSES, use_pretrained=True)
    model_ft = model_ft.to(device)

    # Loss and Optimizer
    criterion = nn.CrossEntropyLoss()
    
    # Observe that all parameters are being optimized
    optimizer_ft = optim.Adam(model_ft.parameters(), lr=LEARNING_RATE)

    # Load Data
    # Note: Ensure train.csv and train_images folder exist before running
    if os.path.exists(CSV_PATH) and os.path.isdir(DATA_DIR):
        print(f"Loading data from {CSV_PATH} and {DATA_DIR}...")
        train_loader, val_loader = get_data_loaders(
            CSV_PATH, 
            DATA_DIR, 
            batch_size=BATCH_SIZE
        )
        
        dataloaders_dict = {
            'train': train_loader, 
            'val': val_loader
        }
        
        # Train
        print("Starting training...")
        model_ft, hist = train_model(
            model_ft, 
            dataloaders_dict, 
            criterion, 
            optimizer_ft, 
            device, 
            num_epochs=NUM_EPOCHS,
            save_path='best_model.pth'
        )
    else:
        print("Error: train.csv or train_images/ not found in current directory.")
        print("Please place the dataset files in the correct location.")
        print(f"Looking for: {os.path.abspath(CSV_PATH)} and {os.path.abspath(DATA_DIR)}")

if __name__ == "__main__":
    main()
