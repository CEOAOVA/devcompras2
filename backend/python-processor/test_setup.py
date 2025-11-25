#!/usr/bin/env python3
"""
Test script to verify backend setup and dependencies
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables from project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

def test_imports():
    """Test that all required packages can be imported"""
    print("Testing imports...")
    
    try:
        import fastapi
        print(f"✓ FastAPI: {fastapi.__version__}")
    except ImportError as e:
        print(f"✗ FastAPI import failed: {e}")
        return False
    
    try:
        import uvicorn
        print(f"✓ Uvicorn imported successfully")
    except ImportError as e:
        print(f"✗ Uvicorn import failed: {e}")
        return False
    
    try:
        import pandas as pd
        print(f"✓ Pandas: {pd.__version__}")
    except ImportError as e:
        print(f"✗ Pandas import failed: {e}")
        return False
    
    try:
        import openpyxl
        print(f"✓ Openpyxl: {openpyxl.__version__}")
    except ImportError as e:
        print(f"✗ Openpyxl import failed: {e}")
        return False
    
    try:
        from supabase import create_client, Client
        print(f"✓ Supabase client imported successfully")
    except ImportError as e:
        print(f"✗ Supabase import failed: {e}")
        return False
    
    return True

def test_environment_variables():
    """Test that required environment variables are set"""
    print("\nTesting environment variables...")
    
    required_vars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY'
    ]
    
    all_present = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✓ {var}: {'*' * 20}...{value[-10:]}")
        else:
            print(f"✗ {var}: Not set")
            all_present = False
    
    return all_present

def test_supabase_connection():
    """Test Supabase connection"""
    print("\nTesting Supabase connection...")
    
    try:
        from supabase import create_client, Client
        
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        
        if not url or not key:
            print("✗ Missing Supabase credentials")
            return False
        
        supabase: Client = create_client(url, key)
        
        # Test connection by trying to access a table (this will fail if tables don't exist, but connection works)
        try:
            result = supabase.table('stores').select('count', count='exact').execute()
            print(f"✓ Supabase connection successful")
            print(f"  Stores table exists with {result.count} records")
            return True
        except Exception as e:
            if "relation \"public.stores\" does not exist" in str(e):
                print("✓ Supabase connection successful (tables not created yet)")
                return True
            else:
                print(f"✗ Supabase query failed: {e}")
                return False
                
    except Exception as e:
        print(f"✗ Supabase connection failed: {e}")
        return False

def test_service_imports():
    """Test that our custom services can be imported"""
    print("\nTesting service imports...")
    
    try:
        from services.database_manager import create_database_manager
        print("✓ Database manager imported successfully")
    except ImportError as e:
        print(f"✗ Database manager import failed: {e}")
        return False
    
    try:
        from services.excel_processor import process_excel_file
        print("✓ Excel processor imported successfully")
    except ImportError as e:
        print(f"✗ Excel processor import failed: {e}")
        return False
    
    try:
        from services.file_detector import detect_file_type
        print("✓ File detector imported successfully")
    except ImportError as e:
        print(f"✗ File detector import failed: {e}")
        return False
    
    return True

def main():
    """Run all tests"""
    print("=" * 50)
    print("Backend Setup Test")
    print("=" * 50)
    
    tests = [
        ("Package Imports", test_imports),
        ("Environment Variables", test_environment_variables),
        ("Supabase Connection", test_supabase_connection),
        ("Service Imports", test_service_imports)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("Test Results Summary")
    print("=" * 50)
    
    all_passed = True
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All tests passed! Backend setup is ready.")
    else:
        print("❌ Some tests failed. Please check the issues above.")
    print("=" * 50)
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
