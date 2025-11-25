#!/usr/bin/env python3
"""
Add Cuautemoc store to the database if it doesn't exist
"""

import os
import sys
from dotenv import load_dotenv
from services.database_manager import create_database_manager

# Load environment variables
load_dotenv()

def add_cuautemoc_store():
    """Add Cuautemoc store to database if it doesn't exist"""
    try:
        db = create_database_manager()
        db.connect()
        
        print("🔍 Checking if Cuautemoc store exists...")
        
        # Check if Cuautemoc store already exists
        existing_stores = db.admin_client.table('stores').select('*').execute()
        
        print("Current stores in database:")
        cuautemoc_exists = False
        for store in existing_stores.data:
            print(f"  ID: {store['id']}, Name: {store['name']}")
            if 'cuautemoc' in store['name'].lower():
                cuautemoc_exists = True
                print(f"  ✅ Found existing Cuautemoc store: {store['name']}")
        
        if not cuautemoc_exists:
            print("\n📝 Adding Cuautemoc store to database...")
            
            # Add the new store
            new_store = {
                'name': 'Sucursal: 10. Cuautemoc'
            }
            
            result = db.admin_client.table('stores').insert(new_store).execute()
            
            if result.data:
                store_id = result.data[0]['id']
                print(f"✅ Successfully added Cuautemoc store with ID: {store_id}")
                print(f"   Store name: {result.data[0]['name']}")
            else:
                print("❌ Failed to add Cuautemoc store")
        else:
            print("\n✅ Cuautemoc store already exists in database")
        
        print("\n" + "=" * 60)
        print("STORE SETUP COMPLETE")
        print("=" * 60)
        print("Your 'ventas cuautemoc 05 de mayo al 05 agosto.xlsx' file")
        print("should now be processed correctly with:")
        print("  - File type: sale (ventas)")
        print("  - Store: Sucursal: 10. Cuautemoc")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nMake sure your .env file has the correct Supabase credentials:")
        print("  - SUPABASE_URL")
        print("  - SUPABASE_ANON_KEY") 
        print("  - SUPABASE_SERVICE_ROLE_KEY")

if __name__ == "__main__":
    add_cuautemoc_store()
