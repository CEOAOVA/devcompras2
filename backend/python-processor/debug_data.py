#!/usr/bin/env python3
"""
Debug script to check what's actually stored in the database
"""

import os
import sys
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.database_manager import create_database_manager

def debug_database_data():
    """Check what's actually stored in the database"""
    try:
        # Load environment variables
        load_dotenv('../.env')
        
        # Create database connection
        db = create_database_manager()
        db.connect()
        
        print("🔍 Checking database contents...")
        
        # Check transactions table
        transactions = db.admin_client.table('transactions').select('*').limit(10).execute()
        print(f"\n📊 Transactions (showing first 10 of {len(transactions.data)}):")
        for i, tx in enumerate(transactions.data[:5]):
            print(f"  {i+1}. Type: '{tx.get('type')}', Quantity: {tx.get('quantity')}, Store ID: {tx.get('store_id')}, Product ID: {tx.get('product_id')}")
        
        # Check unique transaction types
        all_transactions = db.admin_client.table('transactions').select('type').execute()
        unique_types = list(set(tx['type'] for tx in all_transactions.data))
        print(f"\n🏷️  Unique transaction types in database:")
        for t in unique_types:
            count = sum(1 for tx in all_transactions.data if tx['type'] == t)
            print(f"  - '{t}': {count} records")
        
        # Check stores
        stores = db.admin_client.table('stores').select('*').execute()
        print(f"\n🏪 Stores ({len(stores.data)}):")
        for store in stores.data:
            print(f"  - ID: {store['id']}, Name: '{store['name']}'")
        
        # Check products (first few)
        products = db.admin_client.table('products').select('*').limit(5).execute()
        print(f"\n📦 Products (showing first 5):")
        for product in products.data:
            print(f"  - ID: {product['id']}, Code: '{product['code']}', Name: '{product['name']}'")
        
        # Check uploads
        uploads = db.admin_client.table('uploads').select('*').execute()
        print(f"\n📁 Uploads ({len(uploads.data)}):")
        for upload in uploads.data:
            print(f"  - ID: {upload['id']}, Filename: '{upload['filename']}', Type: '{upload.get('file_type')}', Records: {upload.get('records_processed')}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_database_data()
