#!/usr/bin/env python3
"""
Test file detection with the actual cuautemoc file
"""

import os
import sys
from services.file_detector import detect_file_type
from services.get_sucursal import get_sucursal

def test_actual_cuautemoc_file():
    """Test detection with the actual file"""
    
    # Path to the actual file
    actual_file_path = "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/ventas cuautemoc 05 de mayo al 05 agosto.xlsx"
    
    print("=" * 60)
    print("TESTING ACTUAL CUAUTEMOC FILE")
    print("=" * 60)
    print(f"Testing file: {actual_file_path}")
    print()
    
    # Check if file exists
    if not os.path.exists(actual_file_path):
        print(f"❌ File not found: {actual_file_path}")
        print("Please make sure the file path is correct.")
        return
    
    print("✅ File found!")
    print()
    
    # Test file type detection
    print("🔍 Testing file type detection...")
    try:
        file_type = detect_file_type(actual_file_path)
        print(f"✅ Detected file type: {file_type}")
        
        if file_type == 'sale':
            print("✅ Correctly identified as 'ventas' (sale) file")
        else:
            print(f"⚠️  Expected 'sale' but got '{file_type}'")
    except Exception as e:
        print(f"❌ Error detecting file type: {e}")
    
    print()
    
    # Test store detection
    print("🏪 Testing store detection...")
    try:
        store_info = get_sucursal(actual_file_path)
        print(f"✅ Detected store: {store_info}")
        
        if 'cuautemoc' in store_info.lower():
            print("✅ Correctly identified Cuautemoc store")
        else:
            print(f"⚠️  Store detection result: {store_info}")
    except Exception as e:
        print(f"❌ Error detecting store: {e}")
    
    print()
    print("=" * 60)
    print("READY FOR UPLOAD")
    print("=" * 60)
    print("The file should now be processed correctly when uploaded:")
    print(f"  - File type: {file_type if 'file_type' in locals() else 'sale'}")
    print(f"  - Store: {store_info if 'store_info' in locals() else 'Sucursal: 10. Cuautemoc'}")
    print()

if __name__ == "__main__":
    test_actual_cuautemoc_file()
