"""
Date Range Extractor for Excel Files
Extracts date ranges from Spanish text patterns in Excel files
Supports patterns like:
- "Del 5 de mayo al 5 de agosto del 2025"
- "Al 5 de agosto del 2025"
- "ventas satelite 01 enero a 23 mayo 2024.xlsx"
"""

import re
import pandas as pd
from datetime import datetime, date
from typing import Optional, Tuple, Dict, Any
import logging

class DateRangeExtractor:
    """Extract date ranges from Excel files and filenames"""
    
    def __init__(self):
        # Spanish month mapping
        self.spanish_months = {
            'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
            'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
            'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
            'sep': 9, 'sept': 9, 'oct': 10, 'nov': 11, 'dic': 12
        }
        
        # Regex patterns for different date formats
        self.patterns = {
            # "Del 5 de mayo al 5 de agosto del 2025"
            'del_al_pattern': re.compile(
                r'del?\s+(\d{1,2})\s+de\s+(\w+)\s+al?\s+(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})',
                re.IGNORECASE
            ),
            # "Al 5 de agosto del 2025" (single end date)
            'al_pattern': re.compile(
                r'al?\s+(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})',
                re.IGNORECASE
            ),
            # "01 enero a 23 mayo 2024" (filename pattern)
            'filename_range_pattern': re.compile(
                r'(\d{1,2})\s+(\w+)\s+a\s+(\d{1,2})\s+(\w+)\s+(\d{4})',
                re.IGNORECASE
            ),
            # "05 de mayo al 05 agosto" (without year)
            'short_range_pattern': re.compile(
                r'(\d{1,2})\s+de\s+(\w+)\s+al?\s+(\d{1,2})\s+(\w+)',
                re.IGNORECASE
            ),
            # Single date patterns
            'single_date_pattern': re.compile(
                r'(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})',
                re.IGNORECASE
            )
        }
    
    def parse_spanish_month(self, month_str: str) -> Optional[int]:
        """Convert Spanish month name to number"""
        month_str = month_str.lower().strip()
        return self.spanish_months.get(month_str)
    
    def create_date(self, day: int, month: int, year: int) -> Optional[date]:
        """Create a date object with validation"""
        try:
            return date(year, month, day)
        except ValueError as e:
            logging.warning(f"Invalid date: {day}/{month}/{year} - {e}")
            return None
    
    def extract_from_text(self, text: str, default_year: int = None) -> Tuple[Optional[date], Optional[date]]:
        """
        Extract date range from text
        Returns (start_date, end_date) tuple
        """
        if not text:
            return None, None
        
        text = text.strip()
        if not default_year:
            default_year = datetime.now().year
        
        # Try "Del X de MONTH al Y de MONTH del YEAR" pattern
        match = self.patterns['del_al_pattern'].search(text)
        if match:
            start_day, start_month_str, end_day, end_month_str, year = match.groups()
            start_month = self.parse_spanish_month(start_month_str)
            end_month = self.parse_spanish_month(end_month_str)
            
            if start_month and end_month:
                start_date = self.create_date(int(start_day), start_month, int(year))
                end_date = self.create_date(int(end_day), end_month, int(year))
                if start_date and end_date:
                    logging.info(f"Extracted range from 'del-al' pattern: {start_date} to {end_date}")
                    return start_date, end_date
        
        # Try filename pattern "X MONTH a Y MONTH YEAR"
        match = self.patterns['filename_range_pattern'].search(text)
        if match:
            start_day, start_month_str, end_day, end_month_str, year = match.groups()
            start_month = self.parse_spanish_month(start_month_str)
            end_month = self.parse_spanish_month(end_month_str)
            
            if start_month and end_month:
                start_date = self.create_date(int(start_day), start_month, int(year))
                end_date = self.create_date(int(end_day), end_month, int(year))
                if start_date and end_date:
                    logging.info(f"Extracted range from filename pattern: {start_date} to {end_date}")
                    return start_date, end_date
        
        # Try short range pattern "X de MONTH al Y MONTH" (no year)
        match = self.patterns['short_range_pattern'].search(text)
        if match:
            start_day, start_month_str, end_day, end_month_str = match.groups()
            start_month = self.parse_spanish_month(start_month_str)
            end_month = self.parse_spanish_month(end_month_str)
            
            if start_month and end_month:
                start_date = self.create_date(int(start_day), start_month, default_year)
                end_date = self.create_date(int(end_day), end_month, default_year)
                if start_date and end_date:
                    logging.info(f"Extracted range from short pattern: {start_date} to {end_date}")
                    return start_date, end_date
        
        # Try "Al X de MONTH del YEAR" pattern (single end date)
        match = self.patterns['al_pattern'].search(text)
        if match:
            day, month_str, year = match.groups()
            month = self.parse_spanish_month(month_str)
            
            if month:
                end_date = self.create_date(int(day), month, int(year))
                if end_date:
                    logging.info(f"Extracted end date from 'al' pattern: {end_date}")
                    return None, end_date
        
        # Try single date pattern
        match = self.patterns['single_date_pattern'].search(text)
        if match:
            day, month_str, year = match.groups()
            month = self.parse_spanish_month(month_str)
            
            if month:
                single_date = self.create_date(int(day), month, int(year))
                if single_date:
                    logging.info(f"Extracted single date: {single_date}")
                    return single_date, single_date
        
        logging.warning(f"No date pattern found in text: {text[:100]}...")
        return None, None
    
    def extract_from_excel_content(self, file_path: str) -> Tuple[Optional[date], Optional[date]]:
        """
        Extract date range from Excel file content
        Searches through all cells for date patterns
        """
        try:
            # Read Excel file and search all cells
            df = pd.read_excel(file_path, header=None)
            
            # Convert all cells to string and search for date patterns
            for row_idx, row in df.iterrows():
                for col_idx, cell_value in row.items():
                    if pd.isna(cell_value):
                        continue
                    
                    cell_text = str(cell_value).strip()
                    if len(cell_text) < 10:  # Skip very short strings
                        continue
                    
                    start_date, end_date = self.extract_from_text(cell_text)
                    if start_date or end_date:
                        logging.info(f"Found date range in Excel cell [{row_idx}, {col_idx}]: {cell_text}")
                        return start_date, end_date
            
            logging.info("No date patterns found in Excel content")
            return None, None
            
        except Exception as e:
            logging.error(f"Error reading Excel file {file_path}: {e}")
            return None, None
    
    def extract_from_filename(self, filename: str) -> Tuple[Optional[date], Optional[date]]:
        """
        Extract date range from filename
        """
        logging.info(f"Extracting date from filename: {filename}")
        return self.extract_from_text(filename)
    
    def extract_date_range(self, file_path: str) -> Dict[str, Any]:
        """
        Main method to extract date range from Excel file
        Tries both filename and content extraction
        Returns dict with start_date, end_date, and source
        """
        import os
        filename = os.path.basename(file_path)
        
        # Try filename first (more reliable for your use case)
        start_date, end_date = self.extract_from_filename(filename)
        if start_date or end_date:
            return {
                'start_date': start_date,
                'end_date': end_date,
                'source': 'filename',
                'raw_text': filename
            }
        
        # Try Excel content
        start_date, end_date = self.extract_from_excel_content(file_path)
        if start_date or end_date:
            return {
                'start_date': start_date,
                'end_date': end_date,
                'source': 'excel_content',
                'raw_text': 'Excel file content'
            }
        
        # No date range found
        return {
            'start_date': None,
            'end_date': None,
            'source': None,
            'raw_text': None
        }

# Convenience function
def extract_date_range_from_file(file_path: str) -> Dict[str, Any]:
    """Extract date range from Excel file"""
    extractor = DateRangeExtractor()
    return extractor.extract_date_range(file_path)

# Test function
if __name__ == "__main__":
    # Test with sample patterns
    extractor = DateRangeExtractor()
    
    test_cases = [
        "Del 5 de mayo al 5 de agosto del 2025",
        "Al 5 de agosto del 2025",
        "ventas satelite 01 enero a 23 mayo 2024.xlsx",
        "ventas cuautemoc 05 de mayo al 05 agosto.xlsx",
        "No date pattern here"
    ]
    
    for test_text in test_cases:
        start, end = extractor.extract_from_text(test_text)
        print(f"Text: {test_text}")
        print(f"Result: {start} to {end}")
        print("---")
