#!/usr/bin/env python3
"""
Test the fixed cuautemoc file
"""

import os
import sys
from dotenv import load_dotenv
from services.excel_processor import process_excel_file
from services.file_detector import detect_file_type
from services.get_sucursal import get_sucursal
from services.clean_excel_ventas import excel_dataframization_ventas

# Load environment variables
load_dotenv()

def test_fixed_cuautemoc():
    """Test the fixed cuautemoc file"""
    
    # Path to the fixed file
    fixed_file_path = "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/ventas cuautemoc 05 de mayo al 05 agosto_fixed.xlsx"
    
    print("=" * 80)
    print("TESTING FIXED CUAUTEMOC FILE")
    print("=" * 80)
    print(f"File: {fixed_file_path}")
    print()
    
    # Check if file exists
    if not os.path.exists(fixed_file_path):
        print(f"❌ Fixed file not found: {fixed_file_path}")
        return
    
    print("✅ Fixed file found!")
    print()
    
    # Step 1: Test file type detection
    print("🔍 STEP 1: File Type Detection")
    print("-" * 40)
    try:
        file_type = detect_file_type(fixed_file_path)
        print(f"✅ Detected file type: {file_type}")
    except Exception as e:
        print(f"❌ Error in file type detection: {e}")
        return
    
    print()
    
    # Step 2: Test store detection
    print("🏪 STEP 2: Store Detection")
    print("-" * 40)
    try:
        store_info = get_sucursal(fixed_file_path)
        print(f"✅ Detected store: {store_info}")
    except Exception as e:
        print(f"❌ Error in store detection: {e}")
        return
    
    print()
    
    # Step 3: Test Excel processing function
    print("📊 STEP 3: Excel Processing Function")
    print("-" * 40)
    try:
        df, sucursal_from_processor = excel_dataframization_ventas(fixed_file_path)
        print(f"✅ Excel processing successful")
        print(f"   DataFrame shape: {df.shape}")
        print(f"   Columns: {list(df.columns)}")
        print(f"   Store from processor: {sucursal_from_processor}")
        print(f"   Sample data:")
        print(df.head(3))
    except Exception as e:
        print(f"❌ Error in Excel processing: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print()
    
    # Step 4: Test complete pipeline
    print("🔄 STEP 4: Complete Pipeline Test")
    print("-" * 40)
    
    try:
        result = process_excel_file(fixed_file_path)
        print(f"Pipeline result: {result}")
        
        if result.get('success'):
            print("✅ Complete pipeline successful!")
            print(f"   File type: {result.get('file_type')}")
            print(f"   Store name: {result.get('store_name')}")
            print(f"   Store ID: {result.get('store_id')}")
            print(f"   Transactions: {result.get('transaction_count')}")
        else:
            print(f"❌ Pipeline failed: {result.get('error')}")
    except Exception as e:
        print(f"❌ Error in complete pipeline: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    print("=" * 80)
    print("RECOMMENDATION")
    print("=" * 80)
    print("Use the fixed file for uploading:")
    print(f"  {fixed_file_path}")
    print()
    print("This file should now work correctly with the upload system!")

if __name__ == "__main__":
    test_fixed_cuautemoc()
