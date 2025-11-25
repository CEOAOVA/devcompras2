#!/usr/bin/env python3
"""
Test script to debug file type detection
"""

import os
from services.file_detector import FileTypeDetector

def test_file_detection():
    print("🔍 Testing file type detection...")
    
    # Test files from your excel_files directory
    test_files = [
        "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files/Inventario Ecatepec 050825.xlsx",
        "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files/ventas iztapalapa.xlsx", 
        "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files/ventas tlalpan 05 de mayo al 05 agosto.xlsx"
    ]
    
    detector = FileTypeDetector()
    
    for file_path in test_files:
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            file_type, confidence = detector.detect_file_type(file_path)
            print(f"📄 {filename}")
            print(f"   → Type: {file_type}, Confidence: {confidence}")
            
            # Test filename detection specifically
            filename_type = detector._detect_from_filename(filename.lower())
            print(f"   → Filename detection: {filename_type}")
            
            # Test content detection
            try:
                content_type = detector._detect_from_content(file_path)
                print(f"   → Content detection: {content_type}")
            except Exception as e:
                print(f"   → Content detection failed: {e}")
            print()
        else:
            print(f"❌ File not found: {file_path}")

if __name__ == "__main__":
    test_file_detection()
