#!/usr/bin/env python3
"""
Test the complete solution for the cuautemoc file with automatic fixing
"""

import os
import sys
from dotenv import load_dotenv
from services.excel_processor import process_excel_file

# Load environment variables
load_dotenv()

def test_complete_solution():
    """Test the complete solution with the original problematic file"""
    
    # Path to the ORIGINAL problematic file
    original_file_path = "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/ventas cuautemoc 05 de mayo al 05 agosto.xlsx"
    
    print("=" * 80)
    print("TESTING COMPLETE CUAUTEMOC SOLUTION")
    print("=" * 80)
    print("This test uses the ORIGINAL problematic file and should now work")
    print("with automatic Excel fixing integrated into the processing pipeline.")
    print()
    print(f"File: {original_file_path}")
    print()
    
    # Check if file exists
    if not os.path.exists(original_file_path):
        print(f"❌ Original file not found: {original_file_path}")
        return False
    
    print("✅ Original file found!")
    print()
    
    # Test the complete pipeline with automatic fixing
    print("🔄 TESTING COMPLETE PIPELINE WITH AUTO-FIXING")
    print("-" * 60)
    print("This should now:")
    print("1. Detect the Excel file has view settings issues")
    print("2. Automatically fix the file using xlwings")
    print("3. Detect file type as 'sale' (from 'ventas' in filename)")
    print("4. Detect store as 'Cuautemoc' (from filename)")
    print("5. Process all transactions and store in database")
    print()
    
    try:
        result = process_excel_file(original_file_path)
        print("📊 PIPELINE RESULT:")
        print("-" * 30)
        
        if result.get('success'):
            print("✅ SUCCESS! The complete pipeline worked!")
            print(f"   📁 File: {result.get('filename')}")
            print(f"   📋 File type: {result.get('file_type')}")
            print(f"   🏪 Store name: {result.get('store_name')}")
            print(f"   🆔 Store ID: {result.get('store_id')}")
            print(f"   📊 Transactions processed: {result.get('transaction_count')}")
            print(f"   💬 Message: {result.get('message')}")
            print()
            print("🎉 The file should now appear correctly in your History page!")
            return True
        else:
            print("❌ PIPELINE FAILED:")
            print(f"   Error: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION IN PIPELINE: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print()
    print("=" * 80)

def main():
    """Main test function"""
    print("Testing the complete solution for Excel files with view settings issues...")
    print()
    
    success = test_complete_solution()
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    if success:
        print("✅ SUCCESS! The solution is working correctly.")
        print()
        print("What was fixed:")
        print("1. ✅ Added 'cuautemoc' pattern to store detection")
        print("2. ✅ Integrated automatic Excel file fixing for view settings issues")
        print("3. ✅ Enhanced error handling in Excel processing functions")
        print("4. ✅ Complete pipeline now handles problematic Excel files automatically")
        print()
        print("Your original file should now upload successfully!")
        print("The system will automatically:")
        print("- Fix Excel files with view settings issues")
        print("- Detect file type from filename ('ventas' → 'sale')")
        print("- Detect store from filename ('cuautemoc' → 'Sucursal: 10. Cuautemoc')")
        print("- Process all transactions and store them in the database")
    else:
        print("❌ The solution needs more work.")
        print()
        print("Possible issues:")
        print("1. Environment variables not set correctly")
        print("2. xlwings not installed or Excel not available")
        print("3. Database connection issues")
        print("4. File permissions or path issues")
        print()
        print("Check the error messages above for specific details.")
    
    print()
    print("=" * 80)

if __name__ == "__main__":
    main()
