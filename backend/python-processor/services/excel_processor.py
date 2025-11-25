import pandas as pd
import logging
from typing import Dict, Any
import os
import sys

# Import our modules with updated paths
from .database_manager import create_database_manager
from .file_detector import FileTypeDetector
from .web_safe_excel_fixer import WebSafeExcelFixer, get_user_friendly_error_response
from . import clean_excel_stock as stock_processor
from . import clean_excel_ventas as sales_processor

class ExcelProcessor:
    """Main processor for handling Excel files and storing data in flexible database"""
    
    def __init__(self, db_provider: str = None, **db_kwargs):
        self.db = create_database_manager()
        self.detector = FileTypeDetector()
        self.fixer = WebSafeExcelFixer()
        self.processors = {
            'inventory': stock_processor.excel_dataframization_stock,
            'sale': sales_processor.excel_dataframization_ventas
        }
        
    def process_file(self, file_path: str) -> Dict[str, Any]:
        """
        Process a single Excel file and store in database
        Returns processing results and statistics
        """
        filename = os.path.basename(file_path)
        
        try:
            # Connect to database
            self.db.connect()
            
            # Try to fix the Excel file if it has issues
            working_file_path = self.fixer.fix_excel_file(file_path)
            if working_file_path is None:
                # Generate user-friendly error response
                dummy_error = Exception("Excel file could not be processed with web-safe methods")
                error_response = get_user_friendly_error_response(file_path, dummy_error)
                return {
                    'success': False,
                    'filename': filename,
                    'error_type': error_response.get('error_type', 'corrupted_excel'),
                    'error': error_response.get('message', 'Excel file has formatting issues'),
                    'user_message': error_response.get('message', 'Please try re-saving your Excel file and uploading again.'),
                    'user_action_required': error_response.get('user_action_required', True),
                    'suggestions': error_response.get('suggestions', [])
                }
            
            # Use the working file path for all subsequent operations
            actual_file_path = working_file_path
            
            # Detect file type
            file_type, confidence = self.detector.detect_file_type(actual_file_path)
            
            # Process the Excel file using your existing clean_excel functions
            processor_func = self.processors.get(file_type)
            if not processor_func:
                raise ValueError(f"No processor available for file type: {file_type}")
            
            # Your clean_excel functions return (df, sucursal_string)
            df, sucursal_string = processor_func(actual_file_path)
            
            # Process dataframe to database using the new streamlined method
            store_id, store_name, transaction_count = self.db.process_dataframe_to_database(
                df, sucursal_string, filename, file_type, actual_file_path
            )
            
            result = {
                'success': True,
                'filename': filename,
                'file_type': file_type,
                'confidence': confidence,
                'store_name': store_name,
                'store_id': store_id,
                'transaction_count': transaction_count,
                'message': f"Successfully processed {transaction_count} {file_type} transactions from {store_name}"
            }
            
            return result
            
        except Exception as e:
            error_msg = f"Error processing {filename}: {str(e)}"
            
            # Generate user-friendly error response based on the actual error
            error_response = get_user_friendly_error_response(file_path, e)
            
            return {
                'success': False,
                'filename': filename,
                'error': error_msg,
                'error_type': error_response.get('error_type', 'processing_error'),
                'user_message': error_response.get('message', 'An error occurred while processing your file.'),
                'user_action_required': error_response.get('user_action_required', False),
                'suggestions': error_response.get('suggestions', []),
                'technical_details': error_response.get('technical_details', str(e))
            }
        finally:
            self.db.disconnect()
            # Clean up any temporary files created by the fixer
            self.fixer.cleanup()

# Convenience function for single file processing
def process_excel_file(file_path: str, db_provider: str = None, **db_kwargs) -> Dict[str, Any]:
    """Process a single Excel file and return results"""
    # Disable logging to stdout when called from backend
    if len(sys.argv) > 1 and sys.argv[1] == '-c':
        # Running from backend server - disable logging to stdout
        logging.basicConfig(level=logging.CRITICAL)
    
    processor = ExcelProcessor()
    return processor.process_file(file_path)
