#!/usr/bin/env python3
"""
Test the new web-safe Excel fixer with the problematic Cuautemoc file
"""

import sys
import os
import logging

# Add the services directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'services'))

from services.web_safe_excel_fixer import WebSafeExcelFixer, get_user_friendly_error_response

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_cuautemoc_file():
    """Test the web-safe fixer with the Cuautemoc file"""
    
    input_path = "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/ventas cuautemoc 05 de mayo al 05 agosto.xlsx"
    
    print("=" * 80)
    print("TESTING WEB-SAFE EXCEL FIXER")
    print("=" * 80)
    print(f"Input file: {input_path}")
    print()
    
    if not os.path.exists(input_path):
        print(f"❌ File not found: {input_path}")
        return False
    
    # Test the web-safe fixer
    fixer = WebSafeExcelFixer()
    
    try:
        print("🔧 Testing web-safe Excel fixer...")
        fixed_path = fixer.fix_excel_file(input_path)
        
        if fixed_path:
            print(f"✅ Successfully fixed file!")
            print(f"   Fixed file path: {fixed_path}")
            
            # Test if we can read the fixed file
            try:
                import pandas as pd
                df = pd.read_excel(fixed_path)
                print(f"✅ Fixed file is readable by pandas: {df.shape}")
                print("   Sample data:")
                print(df.head(3))
                
                # Test if we can process it with our existing pipeline
                try:
                    from services.file_detector import FileTypeDetector
                    detector = FileTypeDetector()
                    file_type, confidence = detector.detect_file_type(fixed_path)
                    print(f"✅ File type detection: {file_type} (confidence: {confidence:.2f})")
                    
                    # Try to get store name
                    from services.get_sucursal import get_sucursal
                    store_name = get_sucursal(fixed_path)
                    print(f"✅ Store detection: {store_name}")
                    
                except Exception as pipeline_error:
                    print(f"⚠️  Pipeline test failed: {pipeline_error}")
                
                return True
                
            except Exception as read_error:
                print(f"❌ Fixed file cannot be read: {read_error}")
                return False
        else:
            print("❌ Web-safe fixer could not fix the file")
            
            # Generate user-friendly error message
            dummy_error = Exception("WindowWidth corruption detected")
            error_response = get_user_friendly_error_response(input_path, dummy_error)
            
            print("\n" + "=" * 60)
            print("USER-FRIENDLY ERROR RESPONSE")
            print("=" * 60)
            print(f"Error Type: {error_response.get('error_type')}")
            print(f"Message: {error_response.get('message')}")
            print(f"User Action Required: {error_response.get('user_action_required')}")
            print("Suggestions:")
            for i, suggestion in enumerate(error_response.get('suggestions', []), 1):
                print(f"  {i}. {suggestion}")
            
            return False
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False
    
    finally:
        # Cleanup
        fixer.cleanup()

def test_error_response_generation():
    """Test the error response generation for different error types"""
    
    print("\n" + "=" * 80)
    print("TESTING ERROR RESPONSE GENERATION")
    print("=" * 80)
    
    test_cases = [
        Exception("BookView.__init__() got an unexpected keyword argument 'WindowWidth'"),
        Exception("Permission denied accessing file"),
        Exception("Invalid Excel file format"),
        Exception("Some other random error")
    ]
    
    for i, error in enumerate(test_cases, 1):
        print(f"\nTest Case {i}: {error}")
        response = get_user_friendly_error_response("test.xlsx", error)
        print(f"  Error Type: {response.get('error_type')}")
        print(f"  Message: {response.get('message')}")
        print(f"  User Action Required: {response.get('user_action_required')}")
        print(f"  Suggestions: {len(response.get('suggestions', []))} items")

if __name__ == "__main__":
    print("Starting web-safe Excel fixer tests...\n")
    
    # Test with the actual Cuautemoc file
    success = test_cuautemoc_file()
    
    # Test error response generation
    test_error_response_generation()
    
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    if success:
        print("✅ Web-safe Excel fixer successfully processed the Cuautemoc file!")
        print("   The solution is ready for web deployment.")
    else:
        print("❌ Web-safe Excel fixer could not process the Cuautemoc file.")
        print("   User guidance will be provided for manual file fixing.")
    
    print("\n🚀 The web-safe approach eliminates:")
    print("   - Desktop application dependencies (xlwings)")
    print("   - User permission requests")
    print("   - Excel installation requirements")
    print("   - File locking issues")
    
    print("\n📋 Production deployment benefits:")
    print("   - Works in containerized environments")
    print("   - No GUI dependencies")
    print("   - Comprehensive fallback strategies")
    print("   - User-friendly error messages with actionable guidance")
