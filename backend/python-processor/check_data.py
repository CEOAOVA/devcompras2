#!/usr/bin/env python3
"""
Quick data check script to see if we have data in the database
"""

import os
from dotenv import load_dotenv
from services.database_manager import create_database_manager

load_dotenv()

def main():
    print("🔍 Checking database data...")
    
    try:
        # Create database manager
        db = create_database_manager('supabase')
        db.connect()
        
        # Use admin client to bypass RLS
        client = db.db.admin_client
        
        # Check stores and their transaction counts
        stores_result = client.table('stores').select('*').execute()
        print(f"📍 Stores: {len(stores_result.data)}")
        for store in stores_result.data:
            # Count transactions for each store
            store_transactions = client.table('transactions').select('id', count='exact').eq('store_id', store['id']).execute()
            transaction_count = store_transactions.count if hasattr(store_transactions, 'count') else len(store_transactions.data)
            print(f"  - {store['name']} (ID: {store['id']}) → {transaction_count} transactions")
        
        # Check products
        products_result = client.table('products').select('*').limit(5).execute()
        print(f"📦 Products: {len(products_result.data)} (showing first 5)")
        for product in products_result.data:
            print(f"  - {product['code']}: {product['name'][:50]}...")
        
        # Check transactions with store details
        transactions_result = client.table('transactions').select('*').limit(5).execute()
        print(f"💰 Transactions: {len(transactions_result.data)} (showing first 5)")
        for trans in transactions_result.data:
            print(f"  - Store ID: {trans.get('store_id', 'N/A')}, Type: {trans['type']}, Qty: {trans['quantity']} @ ${trans['price']}")
        
        # Check what store IDs exist in transactions
        all_transactions = client.table('transactions').select('store_id').execute()
        store_ids = set(t['store_id'] for t in all_transactions.data if t.get('store_id'))
        print(f"🏪 Store IDs in transactions: {sorted(store_ids)}")
        
        # Check type distribution
        type_check = client.table('transactions').select('type').execute()
        types = {}
        for t in type_check.data:
            type_val = t.get('type', 'unknown')
            types[type_val] = types.get(type_val, 0) + 1
        print(f"📈 Transaction types: {types}")
        
        # Check quantity sorting
        quantity_check = client.table('transactions').select('quantity').order('quantity', desc=True).limit(10).execute()
        print(f"🔢 Top 10 quantities (desc): {[t['quantity'] for t in quantity_check.data]}")
        
        # Check if quantity field exists and has valid data
        qty_stats = client.table('transactions').select('quantity').execute()
        quantities = [t.get('quantity', 0) for t in qty_stats.data if t.get('quantity') is not None]
        if quantities:
            print(f"📊 Quantity stats: min={min(quantities)}, max={max(quantities)}, count={len(quantities)}")
        else:
            print("⚠️ No valid quantity data found")
        
        # Check products table for code and name data
        print("\n🔍 Checking products table...")
        products_result = client.table('products').select('id, code, name').limit(5).execute()
        print(f"📦 Products: {len(products_result.data)} (showing first 5)")
        for prod in products_result.data:
            print(f"  - ID: {prod.get('id')}, Code: {prod.get('code')}, Name: {prod.get('name', 'N/A')[:50]}...")
        
        # Test transaction with product join
        print("\n🔗 Testing transaction-product join...")
        try:
            join_test = client.table('transactions').select('''
                id, store_id, product_id, type, quantity, price,
                products(code, name)
            ''').limit(3).execute()
            
            print(f"🔗 Join test results: {len(join_test.data)} transactions")
            for tx in join_test.data:
                product_data = tx.get('products', {})
                if product_data:
                    print(f"  - TX ID: {tx.get('id')}, Product: {product_data.get('code', 'NO_CODE')} - {product_data.get('name', 'NO_NAME')[:30]}...")
                else:
                    print(f"  - TX ID: {tx.get('id')}, Product: NULL_PRODUCT_DATA")
        except Exception as join_error:
            print(f"❌ Join test failed: {join_error}")
            
            # Try alternative join syntax
            print("🔄 Trying alternative join syntax...")
            try:
                alt_join = client.table('transactions').select('*').limit(3).execute()
                product_ids = [tx['product_id'] for tx in alt_join.data]
                products = client.table('products').select('id, code, name').in_('id', product_ids).execute()
                product_map = {p['id']: p for p in products.data}
                
                print(f"🔗 Alternative join results: {len(alt_join.data)} transactions")
                for tx in alt_join.data:
                    product = product_map.get(tx['product_id'], {})
                    print(f"  - TX ID: {tx.get('id')}, Product: {product.get('code', 'NO_CODE')} - {product.get('name', 'NO_NAME')[:30]}...")
            except Exception as alt_error:
                print(f"❌ Alternative join also failed: {alt_error}")
        
        # Check if we have any data at all
        if len(stores_result.data) == 0 and len(transactions_result.data) == 0:
            print("\n❌ NO DATA FOUND!")
            print("You need to upload Excel files first using the file upload feature.")
        else:
            print(f"\n✅ Database has data: {len(stores_result.data)} stores, {len(transactions_result.data)} transactions")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
