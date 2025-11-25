#!/usr/bin/env python3
"""
Test script to check if users exist in Supabase authentication system
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

def test_auth_users():
    """Test if users exist in Supabase auth system"""
    print("🔍 Checking Supabase authentication users...")
    
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        # Use service key to access auth.users table
        service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not service_key:
            print("⚠ SUPABASE_SERVICE_ROLE_KEY not found in .env")
            print("  Add your service role key to check auth users")
            return False
        
        supabase = create_client(url, service_key)
        
        # Query auth.users table (only accessible with service key)
        result = supabase.table('auth.users').select('id, email, created_at, email_confirmed_at').execute()
        
        if result.data:
            print(f"✓ Found {len(result.data)} authenticated users:")
            for user in result.data:
                status = "✓ Confirmed" if user.get('email_confirmed_at') else "⚠ Unconfirmed"
                print(f"  - {user.get('email', 'No email')} ({status})")
                print(f"    ID: {user.get('id')}")
                print(f"    Created: {user.get('created_at', 'Unknown')}")
        else:
            print("⚠ No authenticated users found")
        
        return len(result.data) > 0
        
    except Exception as e:
        print(f"✗ Error checking auth users: {e}")
        if "auth.users" in str(e):
            print("  Note: auth.users table requires service role key")
        return False

def test_profiles_users():
    """Test if users exist in profiles table"""
    print("\n🔍 Checking profiles table...")
    
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        anon_key = os.getenv('SUPABASE_ANON_KEY')
        
        supabase = create_client(url, anon_key)
        
        # Query profiles table
        result = supabase.table('profiles').select('id, email, full_name, role, created_at').execute()
        
        if result.data:
            print(f"✓ Found {len(result.data)} user profiles:")
            for profile in result.data:
                print(f"  - {profile.get('full_name', 'No name')} ({profile.get('email', 'No email')})")
                print(f"    Role: {profile.get('role', 'No role')}")
                print(f"    Created: {profile.get('created_at', 'Unknown')}")
        else:
            print("⚠ No user profiles found")
        
        return len(result.data) > 0
        
    except Exception as e:
        print(f"✗ Error checking profiles: {e}")
        return False

def create_test_user():
    """Helper to create a test user (requires service key)"""
    print("\n🔧 Creating test user...")
    
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not service_key:
            print("⚠ Service role key required to create users")
            return False
        
        supabase = create_client(url, service_key)
        
        # Create test user
        test_email = "test@emblertest.com"
        test_password = "testpassword123"
        
        result = supabase.auth.admin.create_user({
            "email": test_email,
            "password": test_password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": "Test User"
            }
        })
        
        if result.user:
            print(f"✓ Created test user: {test_email}")
            print(f"  User ID: {result.user.id}")
            return True
        else:
            print("✗ Failed to create test user")
            return False
            
    except Exception as e:
        print(f"✗ Error creating test user: {e}")
        if "already registered" in str(e):
            print("  User already exists - that's okay!")
            return True
        return False

def main():
    """Run all user authentication tests"""
    print("=" * 60)
    print("User Authentication Test")
    print("=" * 60)
    
    # Check if users exist in auth system
    auth_users_exist = test_auth_users()
    
    # Check if users exist in profiles
    profile_users_exist = test_profiles_users()
    
    # Summary
    print("\n" + "=" * 60)
    print("User Test Summary")
    print("=" * 60)
    
    if auth_users_exist:
        print("✓ Users found in authentication system")
    else:
        print("⚠ No users in authentication system")
        
        # Offer to create test user
        create_test = input("\nCreate a test user? (y/n): ").lower().strip()
        if create_test == 'y':
            create_test_user()
    
    if profile_users_exist:
        print("✓ User profiles found")
    else:
        print("⚠ No user profiles found")
        print("  Profiles are created automatically when users sign up")
    
    return auth_users_exist or profile_users_exist

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
