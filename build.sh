#!/bin/bash
# =============================================================
# OcuSight AI — Desktop Build Script
# Builds macOS DMG and/or Windows EXE
# =============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================"
echo "  OcuSight AI Desktop Build"
echo "======================================"

# ---- Step 1: Build React Frontend ----
echo ""
echo "[1/4] Building React frontend..."
cd frontend
npm run build
cd "$SCRIPT_DIR"
echo "✅ Frontend built → frontend/dist/"

# ---- Step 2: Freeze Python Backend with PyInstaller ----
echo ""
echo "[2/4] Freezing Python backend with PyInstaller..."
source .venv/bin/activate
cd backend
pyinstaller --clean --noconfirm ocusight.spec
cd "$SCRIPT_DIR"

# Move PyInstaller output to project root
rm -rf backend-dist
mv backend/dist/ocusight-backend backend-dist
rm -rf backend/build backend/dist
echo "✅ Backend frozen → backend-dist/"

# ---- Step 3: Install Electron dependencies ----
echo ""
echo "[3/4] Installing Electron dependencies..."
cd desktop
npm install
cd "$SCRIPT_DIR"
echo "✅ Electron dependencies installed"

# ---- Step 4: Build Desktop App ----
echo ""
echo "[4/4] Building desktop app..."
cd desktop

TARGET="${1:-mac}"

if [ "$TARGET" = "mac" ] || [ "$TARGET" = "all" ]; then
    echo "Building macOS DMG..."
    npx electron-builder --mac --arm64
    echo "✅ macOS DMG created → dist-electron/"
fi

if [ "$TARGET" = "win" ] || [ "$TARGET" = "all" ]; then
    echo "Building Windows EXE..."
    npx electron-builder --win --x64
    echo "✅ Windows EXE created → dist-electron/"
fi

cd "$SCRIPT_DIR"

echo ""
echo "======================================"
echo "  Build Complete!"
echo "  Output: dist-electron/"
echo "======================================"
ls -la dist-electron/ 2>/dev/null || echo "(No output directory found — check for errors above)"
