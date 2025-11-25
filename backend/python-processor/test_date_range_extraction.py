#!/usr/bin/env python3
"""
Test script for date range extraction functionality
Tests the complete pipeline from Excel file to database storage with business dates
"""

import os
import sys
import logging
from datetime import date
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.date_range_extractor import DateRangeExtractor
from services.database_manager import create_database_manager

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_date_extraction():
    """Test date range extraction with various patterns"""
    print("=" * 60)
    print("TESTING DATE RANGE EXTRACTION")
    print("=" * 60)
    
    extractor = DateRangeExtractor()
    
    test_cases = [
        "Del 5 de mayo al 5 de agosto del 2025",
        "Al 5 de agosto del 2025", 
        "ventas satelite 01 enero a 23 mayo 2024.xlsx",
        "ventas cuautemoc 05 de mayo al 05 agosto.xlsx",
        "inventario iztapalapa 15 de junio del 2024.xlsx",
        "No date pattern here"
    ]
    
    for i, test_text in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: {test_text}")
        result = extractor.extract_date_range(test_text) if test_text.endswith('.xlsx') else {'start_date': None, 'end_date': None, 'source': None}
        
        if not test_text.endswith('.xlsx'):
            start, end = extractor.extract_from_text(test_text)
            result = {'start_date': start, 'end_date': end, 'source': 'text'}
        
        print(f"   Start: {result['start_date']}")
        print(f"   End: {result['end_date']}")
        print(f"   Source: {result['source']}")
        
        if result['start_date'] or result['end_date']:
            print("   ✅ SUCCESS - Date range extracted")
        else:
            print("   ❌ NO DATES - No pattern found")

def test_database_schema():
    """Test if database schema has been updated with new fields"""
    print("\n" + "=" * 60)
    print("TESTING DATABASE SCHEMA")
    print("=" * 60)
    
    try:
        # Load environment
        load_dotenv('../.env')
        
        db = create_database_manager()
        db.connect()
        
        # Check if new columns exist by trying to query them
        print("\n1. Testing business_date_start column...")
        result = db.admin_client.table('transactions').select('business_date_start').limit(1).execute()
        print("   ✅ business_date_start column exists")
        
        print("\n2. Testing business_date_end column...")
        result = db.admin_client.table('transactions').select('business_date_end').limit(1).execute()
        print("   ✅ business_date_end column exists")
        
        print("\n3. Testing date_source column...")
        result = db.admin_client.table('transactions').select('date_source').limit(1).execute()
        print("   ✅ date_source column exists")
        
        # Check existing data
        print("\n4. Checking existing transaction data...")
        result = db.admin_client.table('transactions').select('id, business_date_start, business_date_end, date_source').limit(5).execute()
        
        print(f"   Found {len(result.data)} transactions")
        for row in result.data:
            print(f"   ID {row['id']}: {row['business_date_start']} to {row['business_date_end']} (source: {row['date_source']})")
        
        return True
        
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        print("   💡 You may need to run the database migration first:")
        print("      Run the SQL in add_date_range_fields.sql in your Supabase dashboard")
        return False

def test_api_endpoints():
    """Test API endpoints with business date filtering"""
    print("\n" + "=" * 60)
    print("TESTING API ENDPOINTS")
    print("=" * 60)
    
    import requests
    
    base_url = "http://localhost:8000"
    
    test_endpoints = [
        f"{base_url}/api/health",
        f"{base_url}/api/transactions?limit=3",
        f"{base_url}/api/transactions?date_from=2024-05-01&date_to=2024-08-31&limit=3",
        f"{base_url}/api/statistics/product-sales?date_from=2024-05-01&date_to=2024-08-31"
    ]
    
    for i, url in enumerate(test_endpoints, 1):
        print(f"\n{i}. Testing: {url}")
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"   ✅ SUCCESS - Returned {len(data)} items")
                else:
                    print(f"   ✅ SUCCESS - Response: {data}")
            else:
                print(f"   ❌ ERROR - Status {response.status_code}: {response.text}")
        except requests.exceptions.ConnectionError:
            print("   ⚠️  SKIPPED - Backend server not running")
            print("      Start the backend with: python3 backend/main.py")
        except Exception as e:
            print(f"   ❌ ERROR: {e}")

def main():
    """Run all tests"""
    print("🚀 TESTING DATE RANGE EXTRACTION IMPLEMENTATION")
    print("This script tests the complete date range extraction pipeline")
    
    # Test 1: Date extraction logic
    test_date_extraction()
    
    # Test 2: Database schema
    schema_ok = test_database_schema()
    
    # Test 3: API endpoints (only if schema is OK)
    if schema_ok:
        test_api_endpoints()
    else:
        print("\n⚠️  Skipping API tests - Database schema needs to be updated first")
    
    print("\n" + "=" * 60)
    print("NEXT STEPS:")
    print("=" * 60)
    print("1. If database schema test failed:")
    print("   - Run the SQL in add_date_range_fields.sql in your Supabase dashboard")
    print("   - This adds business_date_start, business_date_end, and date_source columns")
    print()
    print("2. To test with real files:")
    print("   - Upload a new Excel file with date patterns in the filename")
    print("   - Check if business dates are extracted and stored correctly")
    print()
    print("3. To test API filtering:")
    print("   - Start the backend: python3 backend/main.py")
    print("   - Use date range filters in the frontend dashboard")
    print("   - Verify filtering works based on business dates, not upload dates")

if __name__ == "__main__":
    main()
