#!/usr/bin/env python3
"""
Query Uploaded Data Test Script
Analyzes and displays information about uploaded Excel files and their processed data
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from services.database_manager import DatabaseManager

# Load environment variables
load_dotenv()

def print_header(title):
    print("=" * 60)
    print(f"{title}")
    print("=" * 60)

def print_section(title):
    print(f"\n {title}")
    print("-" * 40)

def format_currency(amount):
    """Format currency values"""
    if amount is None:
        return "$0.00"
    return f"${amount:,.2f}"

def main():
    print_header("UPLOADED DATA ANALYSIS")
    
    try:
        # Initialize database manager and connect
        db = DatabaseManager(provider='supabase')
        db.connect()  # This initializes the clients
        
        # Access the admin client to bypass RLS (same as file upload process)
        supabase = db.db.admin_client  # Use admin_client instead of anon_client
        
        # 1. Check uploads table
        print_section("Recent File Uploads")
        uploads = supabase.table('uploads').select('*').order('created_at', desc=True).limit(10).execute()
        
        if uploads.data:
            for upload in uploads.data:
                print(f" File: {upload['filename']}")
                print(f"   Uploaded: {upload['created_at']}")
                print(f"   Status: {upload.get('status', 'Completed')}")
                print(f"   Store: {upload.get('store_name', 'N/A')}")
                if upload.get('records_processed'):
                    print(f"   Records: {upload['records_processed']}")
                print()
        else:
            print(" No file uploads found")
        
        # 2. Check stores
        print_section("Stores in Database")
        stores = supabase.table('stores').select('*').execute()
        
        if stores.data:
            for store in stores.data:
                print(f" {store['name']} (ID: {store['id']})")
                print(f"   Location: {store.get('location', 'N/A')}")
                print()
        else:
            print(" No stores found")
        
        # 3. Check products summary
        print_section("Products Summary")
        products = supabase.table('products').select('*').limit(20).execute()
        
        if products.data:
            print(f" Total Products: {len(products.data)} (showing first 20)")
            print("\nSample Products:")
            for i, product in enumerate(products.data[:10]):
                print(f"{i+1:2d}. {product['code']} - {product['name'][:50]}...")
                if product.get('price'):
                    print(f"     Price: {format_currency(product['price'])}")
        else:
            print(" No products found")
        
        # 4. Check transactions summary
        print_section("Transactions Summary")
        
        # Get transaction counts by type
        transactions = supabase.table('transactions').select('*').execute()
        
        if transactions.data:
            total_transactions = len(transactions.data)
            print(f" Total Transactions: {total_transactions}")
            
            # Group by type
            type_counts = {}
            total_sales = 0
            total_inventory = 0
            
            for trans in transactions.data:
                trans_type = trans['type']
                type_counts[trans_type] = type_counts.get(trans_type, 0) + 1
                
                if trans_type == 'sale' and trans.get('price'):
                    total_sales += trans['price'] * trans.get('quantity', 1)
                elif trans_type == 'inventory' and trans.get('quantity'):
                    total_inventory += trans['quantity']
            
            print("\nTransaction Types:")
            for trans_type, count in type_counts.items():
                print(f"  {trans_type.title()}: {count} transactions")
            
            if total_sales > 0:
                print(f"\n Total Sales Value: {format_currency(total_sales)}")
            if total_inventory > 0:
                print(f" Total Inventory Items: {total_inventory:,}")
            
            # Show recent transactions
            print("\nRecent Transactions (last 10):")
            recent_trans = supabase.table('transactions').select('''
                *,
                products(code, name),
                stores(name)
            ''').order('created_at', desc=True).limit(10).execute()
            
            for i, trans in enumerate(recent_trans.data):
                product_info = trans.get('products', {})
                store_info = trans.get('stores', {})
                
                print(f"{i+1:2d}. {trans['type'].upper()}")
                print(f"     Store: {store_info.get('name', 'Unknown')}")
                print(f"     Product: {product_info.get('code', 'N/A')} - {product_info.get('name', 'Unknown')[:30]}...")
                
                if trans['type'] == 'sale':
                    print(f"     Price: {format_currency(trans.get('price', 0))}")
                else:
                    print(f"     Quantity: {trans.get('quantity', 0)}")
                
                print(f"     Date: {trans['created_at']}")
                print()
        else:
            print(" No transactions found")
        
        # 5. Data quality check
        print_section("Data Quality Check")
        
        # Check for products without names
        products_no_name = supabase.table('products').select('*').is_('name', 'null').execute()
        if products_no_name.data:
            print(f"  Products without names: {len(products_no_name.data)}")
        
        # Check for transactions without products
        trans_no_product = supabase.table('transactions').select('*').is_('product_id', 'null').execute()
        if trans_no_product.data:
            print(f"  Transactions without products: {len(trans_no_product.data)}")
        
        # Check for zero-value transactions
        zero_trans = supabase.table('transactions').select('*').eq('price', 0).eq('quantity', 0).execute()
        if zero_trans.data:
            print(f"  Zero-value transactions: {len(zero_trans.data)}")
        
        print(" Data quality check complete")
        
        # 6. Store-specific analysis
        if stores.data:
            print_section("Store-Specific Analysis")
            
            for store in stores.data:
                store_id = store['id']
                store_name = store['name']
                
                # Get transactions for this store
                store_trans = supabase.table('transactions').select('*').eq('store_id', store_id).execute()
                
                if store_trans.data:
                    sales_count = len([t for t in store_trans.data if t['type'] == 'sale'])
                    inventory_count = len([t for t in store_trans.data if t['type'] == 'inventory'])
                    
                    print(f" {store_name}:")
                    print(f"   Total Transactions: {len(store_trans.data)}")
                    print(f"   Sales: {sales_count}")
                    print(f"   Inventory: {inventory_count}")
                    
                    # Calculate total sales for this store
                    store_sales = sum(t.get('price', 0) * t.get('quantity', 1) 
                                    for t in store_trans.data if t['type'] == 'sale')
                    if store_sales > 0:
                        print(f"   Total Sales: {format_currency(store_sales)}")
                    print()
        
        print_header("ANALYSIS COMPLETE")
        print(" Data analysis finished successfully!")
        
    except Exception as e:
        print(f" Error during analysis: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
