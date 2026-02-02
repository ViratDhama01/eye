import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
import os
import time

def train_anterior_model():
    # --- Configuration ---
    DATA_DIR = "./data/eyee"
    MODEL_SAVE_PATH = "anterior_model.pth"
    NUM_EPOCHS = 5
    BATCH_SIZE = 32
    LEARNING_RATE = 0.001
    
    # --- Hardware Acceleration (MPS) ---
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        print("✅ Using Apple Silicon GPU (MPS)")
    else:
        device = torch.device("cpu")
        print("⚠️ MPS not available. Using CPU.")

    # --- Data Path Logic ---
    # Check if 'train' subfolder exists, otherwise use root
    train_dir = os.path.join(DATA_DIR, 'train')
    if not os.path.exists(train_dir):
        train_dir = DATA_DIR

    if not os.path.exists(train_dir):
        print(f"\n❌ Error: Dataset directory not found at '{DATA_DIR}' or '{train_dir}'.")
        print("Please check your folder structure and try again.")
        return

    print(f"Loading data from: {train_dir}")

    # --- Data Transforms (Augmentation) ---
    data_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(), # Handle selfie mirroring
        transforms.RandomRotation(15),     # Handle tilted phones
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    # --- Dataset & DataLoader ---
    try:
        dataset = datasets.ImageFolder(train_dir, transform=data_transforms)
        class_names = dataset.classes
        num_classes = len(class_names)
        print(f"Detected {num_classes} classes: {class_names}")
    except Exception as e:
        print(f"\n❌ Error loading dataset: {e}")
        print("Ensure the folder contains subfolders for each class (e.g., 'Normal', 'Cataract').")
        return

    dataloader = torch.utils.data.DataLoader(
        dataset, 
        batch_size=BATCH_SIZE, 
        shuffle=True, 
        num_workers=4,
        pin_memory=False # Explicitly False for MPS stability
    )

    # --- Model Setup ---
    print("Initializing EfficientNet_b0...")
    model = models.efficientnet_b0(weights='DEFAULT')
    
    # Modify Classifier
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    
    model = model.to(device)

    # Loss & Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    # --- Training Loop ---
    print(f"\nStarting training for {NUM_EPOCHS} epochs...")
    since = time.time()

    for epoch in range(NUM_EPOCHS):
        model.train()
        running_loss = 0.0
        running_corrects = 0

        for inputs, labels in dataloader:
            inputs = inputs.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()

            outputs = model(inputs)
            loss = criterion(outputs, labels)
            _, preds = torch.max(outputs, 1)

            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(preds == labels.data)
            
        epoch_loss = running_loss / len(dataset)
        epoch_acc = running_corrects.float() / len(dataset) # .float() for MPS precision

        print(f'Epoch {epoch+1}/{NUM_EPOCHS} - Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

    time_elapsed = time.time() - since
    print(f'\nTraining complete in {time_elapsed // 60:.0f}m {time_elapsed % 60:.0f}s')

    # --- Save Model ---
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"✅ Model saved to '{MODEL_SAVE_PATH}'")

if __name__ == "__main__":
    train_anterior_model()
