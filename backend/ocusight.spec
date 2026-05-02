# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for OcuSight AI Backend
# Freezes FastAPI + PyTorch + all dependencies into a single directory

import sys
import os
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

block_cipher = None

# Collect all hidden imports for complex packages
torch_datas, torch_binaries, torch_hiddenimports = collect_all('torch')
torchvision_datas, torchvision_binaries, torchvision_hiddenimports = collect_all('torchvision')
matplotlib_datas, matplotlib_binaries, matplotlib_hiddenimports = collect_all('matplotlib')
gradcam_datas, gradcam_binaries, gradcam_hiddenimports = collect_all('pytorch_grad_cam')
fastapi_datas = collect_data_files('fastapi')
starlette_datas = collect_data_files('starlette')
uvicorn_hiddenimports = collect_submodules('uvicorn')
sqlmodel_hiddenimports = collect_submodules('sqlmodel')
sqlalchemy_hiddenimports = collect_submodules('sqlalchemy')
pydantic_hiddenimports = collect_submodules('pydantic')

# Backend source directory
backend_dir = os.path.dirname(os.path.abspath(SPEC))

a = Analysis(
    [os.path.join(backend_dir, 'main.py')],
    pathex=[backend_dir],
    binaries=torch_binaries + torchvision_binaries + matplotlib_binaries + gradcam_binaries,
    datas=[
        (os.path.join(backend_dir, 'database.py'), '.'),
        (os.path.join(backend_dir, 'dataset_loader.py'), '.'),
        (os.path.join(backend_dir, 'archive_best_model.pth'), '.'),
        (os.path.join(backend_dir, 'anterior_model.pth'), '.'),
        (os.path.join(backend_dir, 'patients.db'), '.'),
    ] + torch_datas + torchvision_datas + fastapi_datas + starlette_datas + matplotlib_datas + gradcam_datas,
    hiddenimports=[
        # --- matplotlib (required by pytorch_grad_cam) ---
        'matplotlib',
        'matplotlib.pyplot',
        'matplotlib.backends',
        'matplotlib.backends.backend_agg',
        'matplotlib.figure',
        'matplotlib.cm',
        'matplotlib.colors',
        # --- uvicorn ---
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        # --- fastapi / starlette ---
        'fastapi',
        'fastapi.middleware',
        'fastapi.middleware.cors',
        'fastapi.responses',
        'starlette',
        'starlette.routing',
        'starlette.middleware',
        'starlette.middleware.cors',
        'starlette.responses',
        'starlette.staticfiles',
        'starlette.formparsers',
        'starlette.concurrency',
        # --- pydantic ---
        'pydantic',
        'pydantic.deprecated',
        'pydantic.deprecated.decorator',
        'pydantic_core',
        # --- sqlmodel / sqlalchemy ---
        'sqlmodel',
        'sqlalchemy',
        'sqlalchemy.sql.default_comparator',
        'sqlalchemy.dialects.sqlite',
        # --- grad-cam ---
        'pytorch_grad_cam',
        'pytorch_grad_cam.grad_cam',
        'pytorch_grad_cam.base_cam',
        'pytorch_grad_cam.utils',
        'pytorch_grad_cam.utils.model_targets',
        'pytorch_grad_cam.utils.image',
        'pytorch_grad_cam.utils.svd_on_activations',
        'pytorch_grad_cam.utils.find_layers',
        # --- image handling ---
        'PIL',
        'PIL.Image',
        'PIL.ImageDraw',
        'PIL.ImageFont',
        'pillow_heif',
        # --- multipart (needed for file uploads) ---
        'multipart',
        'python_multipart',
        'python_multipart.multipart',
        # --- networking ---
        'httptools',
        'httptools.parser',
        'websockets',
        'h11',
        'httpcore',
        # --- async ---
        'anyio',
        'anyio._backends',
        'anyio._backends._asyncio',
        'sniffio',
        # --- email (used by starlette) ---
        'email.mime',
        'email.mime.multipart',
        'email.mime.text',
        # --- cv2 (used by dataset_loader) ---
        'cv2',
        # --- numpy / scipy ---
        'numpy',
        'scipy',
        'scipy.ndimage',
        'sklearn',
        'pandas',
    ] + torch_hiddenimports + torchvision_hiddenimports + gradcam_hiddenimports
      + uvicorn_hiddenimports + sqlmodel_hiddenimports + sqlalchemy_hiddenimports
      + matplotlib_hiddenimports + pydantic_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Only exclude things we truly don't need
        'tkinter',
        'IPython',
        'jupyter',
        'notebook',
        'nbconvert',
        'nbformat',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ocusight-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='ocusight-backend',
)
