#!/usr/bin/env python3
"""
Test file detection for cuautemoc file
"""

import os
import sys
from services.file_detector import detect_file_type
from services.get_sucursal import get_sucursal

def test_cuautemoc_file():
    """Test detection for the cuautemoc file"""
    
    # Test filename (simulating the actual file)
    test_filename = "ventas cuautemoc 05 de mayo al 05 agosto.xlsx"
    test_path = f"/tmp/{test_filename}"  # Simulated path
    
    print("=" * 60)
    print("TESTING CUAUTEMOC FILE DETECTION")
    print("=" * 60)
    print(f"Testing file: {test_filename}")
    print()
    
    # Test file type detection
    print("🔍 Testing file type detection...")
    try:
        file_type = detect_file_type(test_path)
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
        store_info = get_sucursal(test_path)
        print(f"✅ Detected store: {store_info}")
        
        if 'cuautemoc' in store_info.lower():
            print("✅ Correctly identified Cuautemoc store")
        else:
            print(f"⚠️  Store detection might need adjustment: {store_info}")
    except Exception as e:
        print(f"❌ Error detecting store: {e}")
    
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print("Expected results:")
    print("  - File type: 'sale' (because filename contains 'ventas')")
    print("  - Store: 'Sucursal: 10. Cuautemoc' (because filename contains 'cuautemoc')")
    print()

if __name__ == "__main__":
    test_cuautemoc_file()
