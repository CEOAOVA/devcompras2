import pandas as pd
import os
import sys

# Add Dataframization path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..', 'Dataframization'))

try:
    from clean_excel_stock import excel_dataframization_stock
    from clean_excel_ventas import excel_dataframization_ventas
    print("✅ Successfully imported Excel cleaners")
except ImportError as e:
    print(f"❌ Failed to import Excel cleaners: {e}")
    excel_dataframization_stock = None
    excel_dataframization_ventas = None

def test_excel_processing():
    """Test Excel processing to see what data is extracted"""
    
    excel_dir = "/Users/diegoalejandroparraruiz/Documents/Aova/Embler_Stats/Dataframization/excel_files"
    
    print("🔍 Testing Excel processing...")
    print("=" * 80)
    
    for filename in os.listdir(excel_dir):
        if filename.endswith('.xlsx'):
            file_path = os.path.join(excel_dir, filename)
            print(f"\n📁 Processing: {filename}")
            print("-" * 60)
            
            try:
                # Determine file type and processor
                if 'inventario' in filename.lower() or 'stock' in filename.lower():
                    file_type = 'inventory'
                    processor = excel_dataframization_stock
                elif 'ventas' in filename.lower() or 'sales' in filename.lower():
                    file_type = 'sale'
                    processor = excel_dataframization_ventas
                else:
                    file_type = 'unknown'
                    processor = None
                
                print(f"🏷️  Detected type: {file_type}")
                
                if processor:
                    # Process with cleaner
                    cleaned_df, sucursal = processor(file_path)
                    
                    print(f"🏪 Store: {sucursal}")
                    print(f"📊 Cleaned shape: {cleaned_df.shape}")
                    print(f"📋 Cleaned columns: {list(cleaned_df.columns)}")
                    
                    # Show sample data
                    print(f"\n📋 Sample data (first 3 rows):")
                    print(cleaned_df.head(3).to_string())
                    
                    # Check for product names specifically
                    if 'Artículo' in cleaned_df.columns:
                        sample_names = cleaned_df['Artículo'].dropna().head(5).tolist()
                        print(f"\n🏷️  Sample product names from 'Artículo' column:")
                        for i, name in enumerate(sample_names, 1):
                            print(f"   {i}. '{name}'")
                    else:
                        print(f"\n⚠️  'Artículo' column not found!")
                        
                else:
                    print(f"❌ No processor available for {file_type}")
                    
            except Exception as e:
                print(f"❌ Error processing {filename}: {e}")
                import traceback
                traceback.print_exc()
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    test_excel_processing()
