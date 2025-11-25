#!/usr/bin/env python3
"""
Create uploads table in Supabase
Ensures the uploads table exists with the correct structure for tracking file uploads
"""

import os
import sys
from dotenv import load_dotenv
from services.database_manager import create_database_manager

# Load environment variables
load_dotenv()

def create_uploads_table():
    """Create uploads table if it doesn't exist"""
    try:
        db = create_database_manager()
        db.connect()
        
        print("🔍 Checking if uploads table exists...")
        
        # Check if table exists by trying to select from it
        try:
            result = db.admin_client.table('uploads').select('id').limit(1).execute()
            print("✅ Uploads table already exists")
            print(f"   Current records: {len(result.data) if result.data else 0}")
            return True
        except Exception as e:
            print(f"❌ Uploads table doesn't exist or has issues: {e}")
            print("📝 Note: You need to create the uploads table in Supabase manually")
            print("\n🛠️  SQL to create the uploads table:")
            print("""
CREATE TABLE IF NOT EXISTS uploads (
    id BIGSERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    store_id BIGINT REFERENCES stores(id),
    store_name TEXT,
    records_processed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage uploads" ON uploads
    FOR ALL USING (auth.role() = 'service_role');

-- Create policy to allow authenticated users to read uploads
CREATE POLICY "Authenticated users can read uploads" ON uploads
    FOR SELECT USING (auth.role() = 'authenticated');
            """)
            return False
            
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return False

def test_uploads_functionality():
    """Test basic uploads functionality"""
    try:
        db = create_database_manager()
        db.connect()
        
        print("\n🧪 Testing uploads functionality...")
        
        # Test reading uploads
        result = db.admin_client.table('uploads').select('*').limit(5).execute()
        print(f"✅ Can read uploads table: {len(result.data)} records found")
        
        if result.data:
            print("📋 Sample uploads:")
            for upload in result.data[:3]:
                print(f"   - {upload.get('filename', 'Unknown')} ({upload.get('file_size', 0)} bytes)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing uploads functionality: {e}")
        return False

def main():
    print("=" * 60)
    print("UPLOADS TABLE SETUP")
    print("=" * 60)
    
    # Create/check uploads table
    table_exists = create_uploads_table()
    
    if table_exists:
        # Test functionality
        test_uploads_functionality()
        print("\n✅ Uploads table is ready!")
    else:
        print("\n⚠️  Please create the uploads table in Supabase using the SQL above")
        print("   Then run this script again to verify")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
