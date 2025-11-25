import pandas as pd
import os

def analyze_excel_structure():
    """Analyze Excel files to understand column structure and data types"""
    
    excel_files = [
        "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files/Inventario Ecatepec 050825.xlsx",
        "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files/ventas iztapalapa.xlsx"
    ]
    
    for file_path in excel_files:
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            continue
            
        print(f"\n📊 Analyzing: {os.path.basename(file_path)}")
        print("=" * 60)
        
        try:
            # Read Excel file
            df = pd.read_excel(file_path)
            print(f"📏 Shape: {df.shape} (rows x columns)")
            print(f"📋 Columns: {list(df.columns)}")
            
            # Show first few rows
            print("\n🔍 First 3 rows:")
            for i, (_, row) in enumerate(df.head(3).iterrows()):
                print(f"  Row {i+1}:")
                for col in df.columns:
                    value = row[col]
                    print(f"    {col}: {value} (type: {type(value).__name__})")
                print()
            
            # Analyze each column
            print("📈 Column Analysis:")
            for col in df.columns:
                non_null_count = df[col].notna().sum()
                unique_count = df[col].nunique()
                
                # Check if column contains numeric data
                numeric_values = []
                for val in df[col].dropna().head(10):
                    try:
                        numeric_val = float(val)
                        numeric_values.append(numeric_val)
                    except:
                        pass
                
                print(f"  📊 {col}:")
                print(f"    - Non-null values: {non_null_count}/{len(df)}")
                print(f"    - Unique values: {unique_count}")
                print(f"    - Sample values: {list(df[col].dropna().head(5))}")
                if numeric_values:
                    print(f"    - As numbers: {numeric_values[:5]}")
                print()
                
        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")

if __name__ == "__main__":
    analyze_excel_structure()
