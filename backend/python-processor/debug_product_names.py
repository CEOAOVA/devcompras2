#!/usr/bin/env python3
"""
Debug script to check if product names are stored correctly in the database
"""

import os
from dotenv import load_dotenv
from services.database_manager import create_database_manager

load_dotenv()

def main():
    print("🔍 Checking product names in database...")
    
    try:
        # Create database manager
        db = create_database_manager()
        db.connect()
        
        # Check products table
        products_result = db.admin_client.table('products').select('*').limit(10).execute()
        print(f"\n📦 Products table ({len(products_result.data)} samples):")
        print("-" * 80)
        
        for product in products_result.data:
            print(f"ID: {product['id']}")
            print(f"Code: '{product['code']}'")
            print(f"Name: '{product['name']}'")
            print(f"Created: {product.get('created_at', 'N/A')}")
            print("-" * 40)
        
        # Check transactions with product details
        transactions_result = db.admin_client.table('transactions').select('*').limit(5).execute()
        print(f"\n💰 Transactions table ({len(transactions_result.data)} samples):")
        print("-" * 80)
        
        for trans in transactions_result.data:
            # Get product details for this transaction
            product_result = db.admin_client.table('products').select('*').eq('id', trans['product_id']).execute()
            product = product_result.data[0] if product_result.data else None
            
            print(f"Transaction ID: {trans['id']}")
            print(f"Product ID: {trans['product_id']}")
            if product:
                print(f"Product Code: '{product['code']}'")
                print(f"Product Name: '{product['name']}'")
            else:
                print("❌ Product not found!")
            print(f"Store ID: {trans['store_id']}")
            print(f"Type: {trans['type']}")
            print(f"Quantity: {trans['quantity']}")
            print("-" * 40)
        
        # Test the API endpoint logic
        print(f"\n🔗 Testing API endpoint logic:")
        print("-" * 80)
        
        # Get some transactions
        result = db.admin_client.table('transactions').select('*').limit(3).execute()
        
        # Fetch store names and product names separately (same as API)
        store_ids = [row['store_id'] for row in result.data]
        product_ids = [row['product_id'] for row in result.data]
        
        store_query = db.admin_client.table('stores').select('id, name').in_('id', store_ids).execute()
        product_query = db.admin_client.table('products').select('id, code, name').in_('id', product_ids).execute()
        
        print(f"Store query returned: {len(store_query.data)} stores")
        print(f"Product query returned: {len(product_query.data)} products")
        
        store_map = {row['id']: row['name'] for row in store_query.data}
        product_map = {row['id']: {'code': row['code'], 'name': row['name']} for row in product_query.data}
        
        print(f"\nProduct mapping:")
        for pid, pdata in product_map.items():
            print(f"  ID {pid}: '{pdata['code']}' -> '{pdata['name']}'")
        
        # Transform data for frontend (same as API)
        print(f"\nAPI Response Preview:")
        for row in result.data:
            store_name = store_map.get(row['store_id'], "Unknown Store")
            product_code = product_map.get(row['product_id'], {}).get('code', "Unknown")
            product_name = product_map.get(row['product_id'], {}).get('name', "Unknown Product")
            
            print(f"Transaction {row['id']}:")
            print(f"  Store: {store_name}")
            print(f"  Product Code: {product_code}")
            print(f"  Product Name: {product_name}")
            print(f"  Type: {row['type']}")
            print(f"  Quantity: {row['quantity']}")
        
        # Check for any products with empty/null names
        empty_names = db.admin_client.table('products').select('*').or_('name.is.null', 'name.eq.""').execute()

        if empty_names.data:
            print(f"\n⚠️  Found {len(empty_names.data)} products with empty names:")
            for product in empty_names.data:
                print(f"  ID {product['id']}: Code '{product['code']}', Name: '{product.get('name', 'NULL')}'")
        else:
            print(f"\n✅ All products have names")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
