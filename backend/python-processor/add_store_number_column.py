#!/usr/bin/env python3
"""
Migration script to add store_number column to stores table
and populate it with extracted numbers from store names
"""

import os
import re
from dotenv import load_dotenv
from services.database_manager import create_database_manager

load_dotenv()

def extract_store_number(store_name: str) -> int:
    """Extract store number from store name"""
    if not store_name:
        return None
    
    patterns = [
        r'sucursal\s*(\d+)',
        r'store\s*(\d+)', 
        r'tienda\s*(\d+)',
        r'ecatepec\s*(\d+)',
        r'iztapalapa\s*(\d+)',
        r'\b(\d{1,2})\b'  # Any 1-2 digit number
    ]
    
    for pattern in patterns:
        match = re.search(pattern, store_name.lower())
        if match:
            try:
                return int(match.group(1))
            except ValueError:
                continue
    
    return None

def main():
    print("🔧 Adding store_number column to stores table...")
    
    try:
        db = create_database_manager('supabase')
        db.connect()
        client = db.db.admin_client
        
        # First, check if column already exists
        try:
            test_query = client.table('stores').select('store_number').limit(1).execute()
            print("✅ store_number column already exists")
        except Exception:
            print("❌ store_number column doesn't exist, need to add it manually")
            print("\n📝 Please run this SQL in your Supabase SQL editor:")
            print("ALTER TABLE stores ADD COLUMN store_number INTEGER;")
            print("\nThen run this script again to populate the values.")
            return
        
        # Get all stores
        stores_result = client.table('stores').select('*').execute()
        print(f"📍 Found {len(stores_result.data)} stores")
        
        # Update each store with extracted store number
        for store in stores_result.data:
            store_name = store['name']
            current_store_number = store.get('store_number')
            
            if current_store_number is None:
                extracted_number = extract_store_number(store_name)
                if extracted_number:
                    try:
                        client.table('stores').update({
                            'store_number': extracted_number
                        }).eq('id', store['id']).execute()
                        print(f"✅ Updated '{store_name}' → store_number: {extracted_number}")
                    except Exception as e:
                        print(f"❌ Failed to update store {store['id']}: {e}")
                else:
                    print(f"⚠️ Could not extract number from '{store_name}'")
            else:
                print(f"✅ '{store_name}' already has store_number: {current_store_number}")
        
        # Show final results
        updated_stores = client.table('stores').select('*').execute()
        print(f"\n📊 Final store mapping:")
        for store in updated_stores.data:
            print(f"  - {store['name']} (ID: {store['id']}) → Store Number: {store.get('store_number', 'None')}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
