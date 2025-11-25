import pandas as pd
import os
import re

def get_sucursal(path):
    """
    Extract store/sucursal information from Excel file.
    First tries to find 'Sucursal:' pattern inside the file,
    then falls back to extracting from filename.
    """
    search_prefix = "Sucursal:"
    
    try:
        # First, try to find store info inside the Excel file
        try:
            raw_df = pd.read_excel(path, header=None)
        except Exception as excel_error:
            # Handle Excel files with view settings issues (WindowWidth error)
            print(f"Warning: Standard Excel reading failed ({excel_error}), trying alternative method...")
            try:
                raw_df = pd.read_excel(path, engine='xlrd', header=None)
            except:
                try:
                    import openpyxl
                    wb = openpyxl.load_workbook(path, data_only=True)
                    ws = wb.active
                    data = []
                    for row in ws.iter_rows(values_only=True):
                        data.append(row)
                    raw_df = pd.DataFrame(data)
                except Exception as final_error:
                    print(f"Warning: Could not read Excel file {path}: {final_error}")
                    raw_df = None
        
        if raw_df is not None:
            for _, row in raw_df.iterrows():
                for cell in row:
                    if isinstance(cell, str) and cell.startswith(search_prefix):
                        return cell  # return the whole cell string that starts with the prefix
    except Exception as e:
        print(f"Warning: Could not read Excel file {path}: {e}")
    
    # Fallback: Extract store information from filename
    filename = os.path.basename(path).lower()
    print(f"No 'Sucursal:' found in file, trying to extract from filename: {filename}")
    
    # Define store name patterns to look for in filename
    store_patterns = [
        (r'iztapalapa', 'Sucursal: 06. Iztapalapa'),
        (r'tlalpan', 'Sucursal: 08. Tlalpan'),
        (r'ecatepec', 'Sucursal: 09. Ecatepec'),
        (r'satelite', 'Sucursal: 07. Satelite'),
        (r'satélite', 'Sucursal: 07. Satelite'),
        (r'centro', 'Sucursal: 01. Centro'),
        (r'polanco', 'Sucursal: 02. Polanco'),
        (r'roma', 'Sucursal: 03. Roma'),
        (r'condesa', 'Sucursal: 04. Condesa'),
        (r'coyoacan', 'Sucursal: 05. Coyoacan'),
        (r'coyoacán', 'Sucursal: 05. Coyoacan'),
        (r'cuautemoc', 'Sucursal: 10. Cuautemoc'),
        (r'cuauhtémoc', 'Sucursal: 10. Cuautemoc'),
    ]
    
    for pattern, sucursal_name in store_patterns:
        if re.search(pattern, filename):
            print(f"Found store pattern '{pattern}' in filename, using: {sucursal_name}")
            return sucursal_name
    
    # If no pattern matches, try to extract any number that might be a store ID
    number_match = re.search(r'(\d+)', filename)
    if number_match:
        store_number = number_match.group(1)
        fallback_name = f"Sucursal: {store_number.zfill(2)}. Store {store_number}"
        print(f"Using fallback store name based on number in filename: {fallback_name}")
        return fallback_name
    
    # Last resort: use filename as store name
    clean_filename = re.sub(r'\.(xlsx?|csv)$', '', filename)
    fallback_name = f"Sucursal: {clean_filename.title()}"
    print(f"Using filename as store name: {fallback_name}")
    return fallback_name
