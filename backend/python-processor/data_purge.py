#!/usr/bin/env python3
"""
Database cleanup script - removes all data while preserving table structure
"""

import os
from dotenv import load_dotenv
from services.database_manager import create_database_manager

load_dotenv()

def cleanup_database():
    """Clear all data from tables while preserving structure"""
    print("🧹 Starting database cleanup...")
    
    try:
        # Create database manager
        db = create_database_manager()
        db.connect()
        
        # Use admin client to bypass RLS
        client = db.admin_client
        
        # Get current data counts
        print("\n📊 Current data counts:")
        transactions_count = client.table('transactions').select('id', count='exact').execute()
        products_count = client.table('products').select('id', count='exact').execute()
        stores_count = client.table('stores').select('id', count='exact').execute()
        
        # Check if uploads table exists
        try:
            uploads_count = client.table('uploads').select('id', count='exact').execute()
            uploads_exist = True
        except:
            uploads_count = None
            uploads_exist = False
        
        print(f"  - Transactions: {transactions_count.count if hasattr(transactions_count, 'count') else len(transactions_count.data)}")
        print(f"  - Products: {products_count.count if hasattr(products_count, 'count') else len(products_count.data)}")
        print(f"  - Stores: {stores_count.count if hasattr(stores_count, 'count') else len(stores_count.data)}")
        if uploads_exist:
            print(f"  - Uploads: {uploads_count.count if hasattr(uploads_count, 'count') else len(uploads_count.data)}")
        
        # Confirm deletion
        confirm = input("\n⚠️  This will DELETE ALL DATA. Type 'DELETE' to confirm: ")
        if confirm != 'DELETE':
            print("❌ Cleanup cancelled")
            return
        
        print("\n🗑️  Deleting data...")
        
        # Delete in correct order (foreign key constraints)
        # 1. Delete uploads first (if exists) - references stores
        if uploads_exist:
            print("  - Deleting uploads...")
            result = client.table('uploads').delete().neq('id', 0).execute()
            print(f"    ✅ Deleted {len(result.data) if result.data else 'all'} uploads")
        
        # 2. Delete transactions (references products and stores)
        print("  - Deleting transactions...")
        result = client.table('transactions').delete().neq('id', 0).execute()
        print(f"    ✅ Deleted {len(result.data) if result.data else 'all'} transactions")
        
        # 3. Delete products
        print("  - Deleting products...")
        result = client.table('products').delete().neq('id', 0).execute()
        print(f"    ✅ Deleted {len(result.data) if result.data else 'all'} products")
        
        # 4. Delete stores
        print("  - Deleting stores...")
        result = client.table('stores').delete().neq('id', 0).execute()
        print(f"    ✅ Deleted {len(result.data) if result.data else 'all'} stores")
        
        # Verify cleanup
        print("\n🔍 Verifying cleanup...")
        transactions_after = client.table('transactions').select('id', count='exact').execute()
        products_after = client.table('products').select('id', count='exact').execute()
        stores_after = client.table('stores').select('id', count='exact').execute()
        
        print(f"  - Transactions remaining: {transactions_after.count if hasattr(transactions_after, 'count') else len(transactions_after.data)}")
        print(f"  - Products remaining: {products_after.count if hasattr(products_after, 'count') else len(products_after.data)}")
        print(f"  - Stores remaining: {stores_after.count if hasattr(stores_after, 'count') else len(stores_after.data)}")
        
        if uploads_exist:
            uploads_after = client.table('uploads').select('id', count='exact').execute()
            print(f"  - Uploads remaining: {uploads_after.count if hasattr(uploads_after, 'count') else len(uploads_after.data)}")
        
        print("\n✅ Database cleanup completed!")
        print("📋 Table structures preserved - ready for fresh data upload")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        print("💡 You may need to manually delete data from Supabase dashboard")

if __name__ == "__main__":
    cleanup_database()
