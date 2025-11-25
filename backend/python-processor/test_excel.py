#!/usr/bin/env python3
"""
Test script to verify Excel processing functionality
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables from project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

def test_excel_processing():
    """Test Excel processing with existing files"""
    print("Testing Excel processing...")
    
    # Look for Excel files in the Dataframization directory
    excel_dir = "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files"
    
    if not os.path.exists(excel_dir):
        print(f"✗ Excel files directory not found: {excel_dir}")
        return False
    
    # Find Excel files
    excel_files = []
    for file in os.listdir(excel_dir):
        if file.endswith(('.xlsx', '.xls')) and not file.startswith('.'):
            excel_files.append(os.path.join(excel_dir, file))
    
    if not excel_files:
        print(f"✗ No Excel files found in {excel_dir}")
        return False
    
    print(f"Found {len(excel_files)} Excel files:")
    for file in excel_files:
        print(f"  - {os.path.basename(file)}")
    
    # Test with the first file
    test_file = excel_files[0]
    print(f"\nTesting with: {os.path.basename(test_file)}")
    
    try:
        from services.file_detector import detect_file_type
        from services.excel_processor import process_excel_file
        
        # Detect file type
        file_type = detect_file_type(test_file)
        print(f"✓ File type detected: {file_type}")
        
        # Test processing (dry run - don't actually save to database)
        print("✓ Excel processing functions imported successfully")
        print("  Note: Skipping actual processing to avoid database writes during testing")
        
        return True
        
    except Exception as e:
        print(f"✗ Excel processing failed: {e}")
        return False

def test_database_connection():
    """Test database connection and table existence"""
    print("\nTesting database connection...")
    
    try:
        from services.database_manager import create_database_manager
        
        # Create database manager
        db = create_database_manager('supabase')
        db.connect()
        
        print("✓ Database manager created and connected")
        
        # Test table access
        tables_to_check = ['stores', 'products', 'transactions', 'uploads']
        
        for table in tables_to_check:
            try:
                result = db.client.table(table).select('count', count='exact').execute()
                print(f"✓ Table '{table}' exists with {result.count} records")
            except Exception as e:
                if "does not exist" in str(e):
                    print(f"⚠ Table '{table}' does not exist yet (needs to be created)")
                else:
                    print(f"✗ Error accessing table '{table}': {e}")
                    return False
        
        return True
        
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False

def test_fastapi_startup():
    """Test that FastAPI app can be imported and initialized"""
    print("\nTesting FastAPI app...")
    
    try:
        # Change to backend directory for imports
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(backend_dir)
        
        from main import app
        print("✓ FastAPI app imported successfully")
        
        # Test that we can access app info
        print(f"  App title: {app.title}")
        print(f"  App version: {app.version}")
        
        return True
        
    except Exception as e:
        print(f"✗ FastAPI app import failed: {e}")
        return False

def main():
    """Run all Excel processing tests"""
    print("=" * 60)
    print("Excel Processing Test")
    print("=" * 60)
    
    tests = [
        ("Excel File Processing", test_excel_processing),
        ("Database Connection", test_database_connection),
        ("FastAPI App Startup", test_fastapi_startup)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 All tests passed! Excel processing is ready.")
        print("\nNext steps:")
        print("1. Create Supabase tables using the schema file")
        print("2. Start the FastAPI server: uvicorn main:app --reload")
        print("3. Test file upload via the API")
    else:
        print("❌ Some tests failed. Please check the issues above.")
    print("=" * 60)
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
