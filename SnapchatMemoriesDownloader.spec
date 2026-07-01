# -*- mode: python ; coding: utf-8 -*-

import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# Collect timezonefinder data files
timezonefinder_datas = collect_data_files('timezonefinder')

# Collect all submodules for firebase-admin
firebase_submodules = collect_submodules('firebase_admin')

block_cipher = None

a = Analysis(
    ['download_snapchat_memories_gui.py'],
    pathex=[],
    binaries=[],
    datas=timezonefinder_datas,
    hiddenimports=[
        'firebase_admin',
        'firebase_admin.credentials',
        'firebase_admin.firestore',
        'firebase_admin.auth',
        'dotenv',
        'timezonefinder',
        'av',
        'PIL._tkinter_finder',
    ] + firebase_submodules,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SnapchatMemoriesDownloader',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to True if you want a console window for debugging
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add path to .ico file if you have one
)
