#!/usr/bin/env python3
"""
Test script to manually insert an upload record
Run this to test if the uploads table works after the schema fix
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.database_manager import create_database_manager

def test_upload_record():
    """Insert a test upload record"""
    try:
        # Load environment variables
        load_dotenv('../.env')
        
        # Create database connection
        db = create_database_manager()
        db.connect()
        
        # Test upload record
        upload_record = {
            'filename': 'test_file.xlsx',
            'file_type': 'inventory',
            'file_size': 1024,
            'store_id': 1,
            'store_name': 'Test Store',
            'records_processed': 100,
            'status': 'processed',
            'created_at': datetime.now().isoformat()
        }
        
        print("Inserting test upload record...")
        result = db.admin_client.table('uploads').insert(upload_record).execute()
        
        if result.data:
            print(f"✅ Success! Upload record created with ID: {result.data[0]['id']}")
            print(f"Record: {result.data[0]}")
        else:
            print("❌ Failed to create upload record")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_upload_record()
