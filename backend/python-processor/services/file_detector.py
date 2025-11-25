import pandas as pd
import re
from typing import Tuple, Optional

class FileTypeDetector:
    """Detect the type of Excel file - simplified for inventory and sales only"""
    
    def __init__(self):
        # Keywords that help identify file types
        self.inventory_keywords = ['existencia', 'inventario']
        self.sales_keywords = ['ventas', 'venta', 'mostrador']
        
        # Filename patterns
        self.filename_patterns = {
            'inventory': r'(inventario|existencia)',
            'sale': r'(ventas|venta|mostrador)'
        }
    
    def detect_file_type(self, file_path: str) -> Tuple[str, float]:
        """
        Detect file type based on filename and content analysis
        Returns: (file_type, confidence_score)
        """
        filename = file_path.lower()
        
        # First, try filename detection
        filename_type = self._detect_from_filename(filename)
        if filename_type:
            return filename_type, 0.9
        
        # If filename detection fails, analyze content
        content_type = self._detect_from_content(file_path)
        if content_type:
            return content_type, 0.7
        
        # Default fallback - assume sales if uncertain
        return 'sale', 0.3
    
    def _detect_from_filename(self, filename: str) -> Optional[str]:
        """Detect file type from filename patterns"""
        for file_type, pattern in self.filename_patterns.items():
            if re.search(pattern, filename, re.IGNORECASE):
                return file_type
        return None
    
    def _detect_from_content(self, file_path: str) -> Optional[str]:
        """Detect file type by analyzing Excel content"""
        try:
            # Read first few rows to analyze headers and content
            df = pd.read_excel(file_path, nrows=6)
            content_text = ' '.join(df.astype(str).values.flatten()).lower()
            
            # Count keyword occurrences
            inventory_score = sum(1 for keyword in self.inventory_keywords 
                                if keyword in content_text)
            sales_score = sum(1 for keyword in self.sales_keywords 
                            if keyword in content_text)
            
            # Determine type based on highest score
            if inventory_score > sales_score:
                return 'inventory'
            elif sales_score > 0:
                return 'sale'
            
        except Exception as e:
            print(f"Error analyzing file content: {e}")
        
        return None
    
    def get_processor_function(self, file_type: str):
        """Return the appropriate processor function for the file type"""
        processors = {
            'inventory': 'clean_excel_stock.excel_dataframization_stock',
            'sale': 'clean_excel_ventas.excel_dataframization_ventas'
        }
        return processors.get(file_type)

# Utility function for easy use
def detect_and_get_processor(file_path: str) -> Tuple[str, str, float]:
    """
    Convenience function to detect file type and get processor
    Returns: (file_type, processor_function_name, confidence)
    """
    detector = FileTypeDetector()
    file_type, confidence = detector.detect_file_type(file_path)
    processor = detector.get_processor_function(file_type)
    
    return file_type, processor, confidence

def detect_file_type(file_path: str) -> str:
    """
    Simple function to detect file type (for backward compatibility)
    Returns: file_type as string
    """
    detector = FileTypeDetector()
    file_type, confidence = detector.detect_file_type(file_path)
    return file_type
