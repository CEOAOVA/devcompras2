#!/usr/bin/env python3
"""
Debug script to understand why store names are not being extracted properly
"""

import os
import sys
from services import get_sucursal as gs

def debug_store_extraction():
    """Debug store name extraction for specific files"""
    
    # Test filenames from the user's issue
    test_files = [
        "ventas satelite 05 de mayo al 05 agosto.xlsx",
        "ventas satelite 01 enero a 23 mayo 2024.xlsx"
    ]
    
    print("\n🧪 Testing Specific Problematic Filenames")
    print("=" * 45)
    
    for test_file in test_files:
        print(f"\n📄 Testing: {test_file}")
        try:
            # Create a temporary path to test the filename extraction
            temp_path = f"/tmp/{test_file}"
            sucursal_result = gs.get_sucursal(temp_path)
            print(f"   → Result: '{sucursal_result}'")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("🔍 Debugging Store Name Extraction")
    print("=" * 50)
    
    # Check if we have any Excel files in the excel_files directory
    excel_dir = "../../Dataframization/excel_files"
    if os.path.exists(excel_dir):
        print(f"\n📁 Files in {excel_dir}:")
        for file in os.listdir(excel_dir):
            if file.endswith('.xlsx'):
                print(f"   - {file}")
                file_path = os.path.join(excel_dir, file)
                
                try:
                    # Test get_sucursal function
                    sucursal_string = gs.get_sucursal(file_path)
                    print(f"     → Raw sucursal string: '{sucursal_string}'")
                    
                    if sucursal_string:
                        print(f"     ✅ Store info found")
                    else:
                        print(f"     ❌ No store info found")
                        
                        # Let's examine the file structure
                        import pandas as pd
                        try:
                            raw_df = pd.read_excel(file_path, header=None)
                            print(f"     📊 File shape: {raw_df.shape}")
                            print(f"     📋 First few rows:")
                            for i in range(min(10, len(raw_df))):
                                row_content = []
                                for cell in raw_df.iloc[i]:
                                    if pd.notna(cell) and str(cell).strip():
                                        row_content.append(str(cell)[:50])  # Limit length
                                if row_content:
                                    print(f"       Row {i}: {row_content}")
                        except Exception as e:
                            print(f"     ❌ Error reading file: {e}")
                            
                except Exception as e:
                    print(f"     ❌ Error processing {file}: {e}")
                
                print()
    else:
        print(f"❌ Excel files directory not found: {excel_dir}")
    
    # Test the pattern matching logic
    print("\n🔍 Testing Pattern Matching")
    print("=" * 30)
    
    test_patterns = [
        "Sucursal: 06 Iztapalapa",
        "Sucursal 06 Iztapalapa", 
        "Satelite",
        "satelite",
        "Iztapalapa",
        "Ecatepec",
        "Sucursal: Satelite",
        "Tienda Satelite"
    ]
    
    for pattern in test_patterns:
        print(f"Testing: '{pattern}'")
        # Simulate what get_sucursal would find
        if pattern.startswith("Sucursal:"):
            print(f"  ✅ Would be found by get_sucursal")
        else:
            print(f"  ❌ Would NOT be found by get_sucursal")

if __name__ == "__main__":
    debug_store_extraction()
