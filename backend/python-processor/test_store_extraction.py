#!/usr/bin/env python3
"""
Test script to debug store name extraction from Excel files
"""

import os
from services import get_sucursal as gs
from services.database_manager import SupabaseDatabase

def test_store_extraction():
    print("🔍 Testing store name extraction from Excel files...")
    
    # Test files from your excel_files directory
    test_files = [
        "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files/Inventario Ecatepec 050825.xlsx",
        "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files/ventas iztapalapa.xlsx", 
        "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files/ventas tlalpan 05 de mayo al 05 agosto.xlsx"
    ]
    
    # Create database instance to test store name extraction
    db = SupabaseDatabase()
    
    for file_path in test_files:
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            print(f"\n📄 {filename}")
            
            try:
                # Test get_sucursal function
                sucursal_string = gs.get_sucursal(file_path)
                print(f"   → Raw sucursal string: '{sucursal_string}'")
                
                # Test store name extraction
                extracted_name = db._extract_store_name(sucursal_string)
                print(f"   → Extracted store name: '{extracted_name}'")
                
                # Show what this would match in database
                print(f"   → Would create/find store: '{extracted_name}'")
                
            except Exception as e:
                print(f"   → Error: {e}")
        else:
            print(f"❌ File not found: {file_path}")
    
    print(f"\n🏪 Current stores in database:")
    print(f"   - Sucursal 06 Iztapalapa (ID: 5)")
    print(f"   - Sucursal 08 Tlalpan (ID: 6)")
    print(f"   - Sucursal 09 Ecatepec (ID: 7)")
    print(f"   - Sucursal 01 Satélite (ID: 8)")
    
    print(f"\n💡 Check if extracted names match existing store names exactly!")

if __name__ == "__main__":
    test_store_extraction()
