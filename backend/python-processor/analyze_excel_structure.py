import pandas as pd
import os
import sys

def analyze_excel_files():
    """Analyze Excel files to understand their structure"""
    
    excel_dir = "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files"
    
    print("🔍 Analyzing Excel file structures...")
    print("=" * 80)
    
    for filename in os.listdir(excel_dir):
        if filename.endswith('.xlsx'):
            file_path = os.path.join(excel_dir, filename)
            print(f"\n📁 File: {filename}")
            print("-" * 60)
            
            try:
                # Read Excel file
                df = pd.read_excel(file_path)
                
                print(f"📊 Shape: {df.shape} (rows x columns)")
                print(f"📋 Columns: {list(df.columns)}")
                
                # Look for potential product name columns
                name_columns = []
                for col in df.columns:
                    col_lower = str(col).lower()
                    if any(keyword in col_lower for keyword in ['descripcion', 'description', 'nombre', 'name', 'producto', 'product', 'articulo']):
                        name_columns.append(col)
                
                if name_columns:
                    print(f"🏷️  Potential name columns: {name_columns}")
                    
                    # Show sample data for name columns
                    for col in name_columns:
                        sample_values = df[col].dropna().head(5).tolist()
                        print(f"   {col} samples: {sample_values}")
                else:
                    print("⚠️  No obvious product name columns found")
                
                # Show first few rows
                print(f"\n📋 First 3 rows:")
                print(df.head(3).to_string())
                
            except Exception as e:
                print(f"❌ Error reading {filename}: {e}")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    analyze_excel_files()
