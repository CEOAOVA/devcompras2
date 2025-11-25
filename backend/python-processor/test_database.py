#!/usr/bin/env python3
"""
Database verification script for Embler Autopartes system
Tests all tables and shows actual data stored
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables from project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

def test_database_connection():
    """Test basic database connection"""
    print("Testing database connection...")
    try:
        from services.database_manager import create_database_manager
        
        db = create_database_manager('supabase')
        db.connect()
        
        print("✓ Database connection successful")
        return db
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return None

def test_table_exists(db, table_name):
    """Test if a table exists and show its structure"""
    try:
        result = db.client.table(table_name).select('*').limit(1).execute()
        print(f"✓ Table '{table_name}' exists")
        return True
    except Exception as e:
        if "does not exist" in str(e):
            print(f"✗ Table '{table_name}' does not exist")
        else:
            print(f"✗ Error accessing table '{table_name}': {e}")
        return False

def show_table_data(db, table_name, limit=5):
    """Show sample data from a table"""
    try:
        result = db.client.table(table_name).select('*').limit(limit).execute()
        data = result.data
        
        if data:
            print(f"\n📊 Sample data from '{table_name}' ({len(data)} records shown):")
            for i, record in enumerate(data, 1):
                print(f"  {i}. {record}")
        else:
            print(f"\n📊 Table '{table_name}' is empty")
        
        # Get total count
        count_result = db.client.table(table_name).select('*', count='exact').execute()
        print(f"   Total records: {count_result.count}")
        
    except Exception as e:
        print(f"✗ Error reading data from '{table_name}': {e}")

def test_profiles_table_specifically():
    """Specifically test the profiles table with direct Supabase client"""
    print("\n🔍 Testing profiles table directly...")
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        
        if not url or not key:
            print("✗ Missing Supabase credentials")
            return False
        
        supabase = create_client(url, key)
        
        # Try to access profiles table
        result = supabase.table('profiles').select('*').execute()
        print(f"✓ Profiles table accessible with {len(result.data)} records")
        
        if result.data:
            for profile in result.data:
                print(f"  - {profile.get('full_name', 'N/A')} ({profile.get('email', 'N/A')})")
        
        return True
        
    except Exception as e:
        print(f"✗ Profiles table error: {e}")
        return False

def show_all_tables():
    """Show all available tables in the database"""
    print("\n📋 Checking all tables...")
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        supabase = create_client(url, key)
        
        # Try common table names
        tables_to_check = ['profiles', 'stores', 'products', 'transactions', 'uploads']
        
        existing_tables = []
        for table in tables_to_check:
            try:
                result = supabase.table(table).select('*', count='exact').limit(1).execute()
                existing_tables.append((table, result.count))
                print(f"✓ {table}: {result.count} records")
            except Exception as e:
                if "does not exist" in str(e):
                    print(f"✗ {table}: Table does not exist")
                else:
                    print(f"⚠ {table}: Error - {e}")
        
        return existing_tables
        
    except Exception as e:
        print(f"✗ Error checking tables: {e}")
        return []

def main():
    """Run all database tests"""
    print("=" * 60)
    print("Database Verification Test")
    print("=" * 60)
    
    # Test basic connection
    db = test_database_connection()
    if not db:
        print("Cannot proceed without database connection")
        return False
    
    # Check all tables
    existing_tables = show_all_tables()
    
    # Test profiles table specifically
    test_profiles_table_specifically()
    
    # Show data from existing tables
    for table_name, count in existing_tables:
        if count > 0:
            show_table_data(db, table_name)
    
    print("\n" + "=" * 60)
    print("Database Test Complete")
    print("=" * 60)
    
    if existing_tables:
        print(f"✓ Found {len(existing_tables)} tables")
        if any(name == 'profiles' for name, _ in existing_tables):
            print("✓ Profiles table is working")
        else:
            print("⚠ Profiles table missing - run the SQL schema in Supabase")
    else:
        print("⚠ No tables found - run the SQL schema in Supabase")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
