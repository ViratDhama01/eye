import os
import time
import copy
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from sklearn.metrics import cohen_kappa_score
import numpy as np

def initialize_model(num_classes, use_pretrained=True):
    """
    Initializes EfficientNet_b0.
    """
    model = models.efficientnet_b0(weights='IMAGENET1K_V1' if use_pretrained else None)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    return model

def train_model(model, dataloaders, criterion, optimizer, scheduler, device, num_epochs=10, save_path='archive_model.pth'):
    since = time.time()
    best_model_wts = copy.deepcopy(model.state_dict())
    best_loss = float('inf')
    best_kappa = -1.0

    dataset_sizes = {x: len(dataloaders[x].dataset) for x in ['train', 'val']}

    for epoch in range(num_epochs):
        print(f'Epoch {epoch}/{num_epochs - 1}')
        print('-' * 10)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0
            all_preds = []
            all_labels = []

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    _, preds = torch.max(outputs, 1)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.float() / dataset_sizes[phase]
            epoch_kappa = cohen_kappa_score(all_labels, all_preds, weights='quadratic')

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f} QWK: {epoch_kappa:.4f}')

            if phase == 'val':
                # Step the scheduler based on validation loss
                scheduler.step(epoch_loss)
                
                if epoch_loss < best_loss:
                    best_loss = epoch_loss
                    best_kappa = epoch_kappa
                    best_model_wts = copy.deepcopy(model.state_dict())
                    torch.save(model.state_dict(), save_path)
                    print(f"New best model saved with Loss: {best_loss:.4f} and QWK: {best_kappa:.4f}")

        print()

    time_elapsed = time.time() - since
    print(f'Training complete in {time_elapsed // 60:.0f}m {time_elapsed % 60:.0f}s')
    print(f'Best val Loss: {best_loss:.4f}')
    print(f'Best val QWK: {best_kappa:.4f}')

    model.load_state_dict(best_model_wts)
    return model

def main():
    # --- Configuration ---
    DATA_ROOT = "/Users/viratdhama/PersonalProjects/eye/data/archive/augmented_resized_V2"
    TRAIN_DIR = os.path.join(DATA_ROOT, "train")
    VAL_DIR = os.path.join(DATA_ROOT, "val")
    BATCH_SIZE = 32
    NUM_EPOCHS = 10
    NUM_CLASSES = 5
    LEARNING_RATE = 0.001
    MODEL_SAVE_PATH = 'archive_best_model.pth'

    # --- Hardware Acceleration ---
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        print("✅ Using Apple Silicon GPU (MPS)")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        print("✅ Using CUDA GPU")
    else:
        device = torch.device("cpu")
        print("⚠️ GPU not available. Using CPU.")

    # --- Data Transforms ---
    data_transforms = {
        'train': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    # --- Datasets & Loaders ---
    if not os.path.exists(TRAIN_DIR) or not os.path.exists(VAL_DIR):
        print(f"❌ Error: Could not find train/val directories in {DATA_ROOT}")
        return

    image_datasets = {
        'train': datasets.ImageFolder(TRAIN_DIR, data_transforms['train']),
        'val': datasets.ImageFolder(VAL_DIR, data_transforms['val'])
    }

    dataloaders = {
        'train': torch.utils.data.DataLoader(image_datasets['train'], batch_size=BATCH_SIZE, shuffle=True, num_workers=4),
        'val': torch.utils.data.DataLoader(image_datasets['val'], batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
    }

    print(f"Loaded {len(image_datasets['train'])} training images.")
    print(f"Loaded {len(image_datasets['val'])} validation images.")

    # --- Model Setup ---
    print("Initializing EfficientNet_b0...")
    model = initialize_model(NUM_CLASSES)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    # Add Learning Rate Scheduler
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.1, patience=2)

    # --- Training ---
    print("Starting training...")
    train_model(model, dataloaders, criterion, optimizer, scheduler, device, num_epochs=NUM_EPOCHS, save_path=MODEL_SAVE_PATH)

if __name__ == "__main__":
    main()
