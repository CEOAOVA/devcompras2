#!/usr/bin/env python3
"""
Integration test for the complete Embler Autopartes system
Tests the full flow: Excel upload -> Processing -> Database -> API endpoints
"""

import sys
import os
import requests
import time
from dotenv import load_dotenv

# Load environment variables from project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# Test configuration
API_BASE_URL = 'http://localhost:8000'
TEST_EXCEL_FILE = "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files/ventas iztapalapa.xlsx"

def test_api_health():
    """Test API health endpoint"""
    print("Testing API health...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API is healthy: {data['service']}")
            return True
        else:
            print(f"✗ API health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ API connection failed: {e}")
        return False

def test_file_upload():
    """Test Excel file upload and processing"""
    print(f"\nTesting file upload...")
    
    if not os.path.exists(TEST_EXCEL_FILE):
        print(f"✗ Test file not found: {TEST_EXCEL_FILE}")
        return False
    
    try:
        with open(TEST_EXCEL_FILE, 'rb') as f:
            files = {'file': (os.path.basename(TEST_EXCEL_FILE), f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            print(f"  Uploading: {os.path.basename(TEST_EXCEL_FILE)}")
            response = requests.post(f"{API_BASE_URL}/api/upload", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Upload successful!")
                print(f"  Store: {data.get('store_name', 'N/A')}")
                print(f"  Transactions: {data.get('transaction_count', 'N/A')}")
                print(f"  File type: {data.get('file_type', 'N/A')}")
                return True
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                print(f"✗ Upload failed: {response.status_code}")
                print(f"  Error: {error_data.get('detail', 'Unknown error')}")
                return False
                
    except requests.exceptions.RequestException as e:
        print(f"✗ Upload request failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Upload error: {e}")
        return False

def test_stores_endpoint():
    """Test stores API endpoint"""
    print(f"\nTesting stores endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/stores", timeout=10)
        if response.status_code == 200:
            stores = response.json()
            print(f"✓ Retrieved {len(stores)} stores")
            for store in stores[:3]:  # Show first 3
                print(f"  - {store['name']} (ID: {store['id']})")
            return True
        else:
            print(f"✗ Stores endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Stores request failed: {e}")
        return False

def test_transactions_endpoint():
    """Test transactions API endpoint"""
    print(f"\nTesting transactions endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/transactions?limit=5", timeout=10)
        if response.status_code == 200:
            transactions = response.json()
            print(f"✓ Retrieved {len(transactions)} transactions")
            for tx in transactions[:2]:  # Show first 2
                print(f"  - {tx['store_name']}: {tx['product_name']} (${tx['price']})")
            return True
        else:
            print(f"✗ Transactions endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Transactions request failed: {e}")
        return False

def test_statistics_endpoint():
    """Test statistics API endpoint"""
    print(f"\nTesting statistics endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/statistics/product-sales", timeout=10)
        if response.status_code == 200:
            stats = response.json()
            print(f"✓ Retrieved statistics for {len(stats)} products")
            if stats:
                top_product = max(stats, key=lambda x: x['total_sold'])
                print(f"  Top product: {top_product['product_name']} ({top_product['total_sold']} sold)")
            return True
        else:
            print(f"✗ Statistics endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Statistics request failed: {e}")
        return False

def test_frontend_connection():
    """Test that frontend can be reached"""
    print(f"\nTesting frontend connection...")
    try:
        # Test if Vite dev server is running (usually on port 5173)
        response = requests.get("http://localhost:5173", timeout=5)
        if response.status_code == 200:
            print("✓ Frontend is accessible at http://localhost:5173")
            return True
        else:
            print("⚠ Frontend not accessible (may not be running)")
            return False
    except requests.exceptions.RequestException:
        print("⚠ Frontend not accessible at http://localhost:5173")
        print("  Run 'npm run dev' in the project root to start the frontend")
        return False

def main():
    """Run all integration tests"""
    print("=" * 60)
    print("Embler Autopartes Integration Test")
    print("=" * 60)
    
    tests = [
        ("API Health Check", test_api_health),
        ("File Upload & Processing", test_file_upload),
        ("Stores Endpoint", test_stores_endpoint),
        ("Transactions Endpoint", test_transactions_endpoint),
        ("Statistics Endpoint", test_statistics_endpoint),
        ("Frontend Connection", test_frontend_connection)
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
    print("Integration Test Results")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All integration tests passed!")
        print("\nYour Embler Autopartes system is fully functional!")
        print("\nNext steps:")
        print("1. Start the frontend: npm run dev")
        print("2. Visit http://localhost:5173")
        print("3. Upload Excel files and view analytics")
    else:
        print("❌ Some integration tests failed.")
        print("\nTroubleshooting:")
        if not results[0][1]:  # API health failed
            print("- Make sure FastAPI backend is running: python start_server.py")
        if not results[1][1]:  # Upload failed
            print("- Check Supabase tables are created")
            print("- Verify .env file has correct Supabase credentials")
        if not results[-1][1]:  # Frontend failed
            print("- Start the frontend: npm run dev")
    
    print("=" * 60)
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
