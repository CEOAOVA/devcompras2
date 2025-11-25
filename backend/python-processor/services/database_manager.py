from datetime import datetime
import logging
import pandas as pd
from abc import ABC, abstractmethod
from typing import Tuple, Dict, Any
from .date_range_extractor import DateRangeExtractor
import sys
import json
import os

# Add Dataframization path to use existing cleaners
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..', 'Dataframization'))

try:
    from clean_excel_stock import clean_excel_stock
    from clean_excel_ventas import clean_excel_ventas
except ImportError:
    logging.warning("Could not import Excel cleaners - will use basic processing")
    clean_excel_stock = None
    clean_excel_ventas = None

class DatabaseInterface(ABC):
    """Abstract interface for database operations"""
    
    @abstractmethod
    def connect(self):
        pass
    
    @abstractmethod
    def disconnect(self):
        pass
    
    @abstractmethod
    def get_or_create_store(self, store_name: str) -> Tuple[int, str]:
        pass
    
    @abstractmethod
    def get_or_create_product(self, code: str, name: str) -> int:
        pass
    
    @abstractmethod
    def process_dataframe_to_database(self, df, sucursal_string: str, filename: str, file_type: str, file_path: str = None) -> Tuple[int, str, int]:
        pass

class SupabaseDatabase(DatabaseInterface):
    """Simplified Supabase implementation using existing Excel cleaners"""

    def __init__(self, url: str = None, key: str = None):
        self.url = url or os.getenv('SUPABASE_URL')
        self.anon_key = os.getenv('SUPABASE_ANON_KEY')
        # Be flexible with env var names for the service role key to work in local dev and production
        self.service_key = (
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            or os.getenv('SUPABASE_SERVICE_ROLE')
            or os.getenv('SUPABASE_SERVICE_KEY')
        )
        self.anon_client = None
        self.admin_client = None
        self.product_cache = {}  # Cache for products

        # Schema prefix for multi-schema DevWhats project
        self.schema = os.getenv('DEVCOMPRAS_SCHEMA', 'devcompras')

    def _table(self, table_name: str) -> str:
        """Helper to add schema prefix to table names"""
        return f'{self.schema}.{table_name}'
        
    def connect(self):
        try:
            from supabase import create_client
            self.anon_client = create_client(self.url, self.anon_key)
            if self.service_key:
                self.admin_client = create_client(self.url, self.service_key)
            else:
                self.admin_client = self.anon_client
            logging.info("Connected to Supabase successfully")
        except Exception as e:
            logging.error(f"Failed to connect to Supabase: {e}")
            raise
    
    def disconnect(self):
        self.anon_client = None
        self.admin_client = None
        self.product_cache.clear()
    
    def get_or_create_store(self, store_name: str) -> Tuple[int, str]:
        """Get or create store in database"""
        try:
            # Check if store exists
            result = self.admin_client.table(self._table('stores')).select('id, name').eq('name', store_name).execute()

            if result.data:
                store = result.data[0]
                return store['id'], store['name']

            # Create new store
            result = self.admin_client.table(self._table('stores')).insert({
                'name': store_name,
                'created_at': datetime.now().isoformat()
            }).execute()
            
            if result.data:
                store = result.data[0]
                logging.info(f"Created new store: {store_name} (ID: {store['id']})")
                return store['id'], store['name']
            
            raise Exception("Failed to create store")
            
        except Exception as e:
            logging.error(f"Error getting/creating store {store_name}: {e}")
            raise
    
    def get_or_create_product(self, code: str, name: str) -> int:
        """Get or create product in database with caching"""
        cache_key = f"{code}_{name}"

        if cache_key in self.product_cache:
            return self.product_cache[cache_key]

        try:
            # Check if product exists by code
            result = self.admin_client.table(self._table('products')).select('id').eq('code', code).execute()

            if result.data:
                product_id = result.data[0]['id']
                self.product_cache[cache_key] = product_id
                return product_id

            # Create new product
            result = self.admin_client.table(self._table('products')).insert({
                'code': code,
                'name': name,
                'created_at': datetime.now().isoformat()
            }).execute()
            
            if result.data:
                product_id = result.data[0]['id']
                self.product_cache[cache_key] = product_id
                return product_id
            
            raise Exception("Failed to create product")
            
        except Exception as e:
            logging.error(f"Error getting/creating product {code}: {e}")
            raise
    
    def _validate_transaction_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean transaction data for JSON serialization"""
        cleaned = {}
        for key, value in data.items():
            if pd.isna(value) or value in [float('inf'), float('-inf')]:
                cleaned[key] = None
            elif isinstance(value, (int, float)) and pd.notna(value):
                cleaned[key] = float(value) if value != int(value) else int(value)
            else:
                cleaned[key] = str(value) if value is not None else None
        return cleaned
    
    def process_dataframe_to_database(self, df, sucursal_string: str, filename: str, file_type: str, file_path: str = None) -> Tuple[int, str, int]:
        """Process Excel data using existing cleaners and store in Supabase"""
        try:
            # Extract date range from file if path is provided
            date_extractor = DateRangeExtractor()
            date_info = {'start_date': None, 'end_date': None, 'source': 'upload_time'}
            
            if file_path:
                date_info = date_extractor.extract_date_range(file_path)
                logging.info(f"Extracted date range: {date_info['start_date']} to {date_info['end_date']} from {date_info['source']}")
            
            # Use existing Excel cleaners based on file type
            if file_type.lower() in ['inventario', 'stock'] and clean_excel_stock:
                logging.info("Using clean_excel_stock for processing")
                cleaned_df = clean_excel_stock(df)
            elif file_type.lower() in ['ventas', 'sales'] and clean_excel_ventas:
                logging.info("Using clean_excel_ventas for processing")
                cleaned_df = clean_excel_ventas(df)
            else:
                logging.info("Using basic processing (cleaners not available)")
                cleaned_df = df.copy()
            
            # Get or create store
            store_id, store_name = self.get_or_create_store(sucursal_string)
            logging.info(f"Processing {len(cleaned_df)} rows for store: {store_name}")
            
            # OPTIMIZATION 1: Bulk collect all unique products first
            unique_products = {}
            for _, row in cleaned_df.iterrows():
                codigo = str(row.get('Código', row.get('Artículo', ''))).strip()
                descripcion = str(row.get('Artículo', row.get('Descripción', ''))).strip()
                if codigo and codigo != 'nan':
                    unique_products[codigo] = descripcion
            
            logging.info(f"Found {len(unique_products)} unique products")
            
            # DEBUG: Log first few products to verify names are extracted
            sample_products = list(unique_products.items())[:3]
            for code, name in sample_products:
                logging.info(f"DEBUG Product: Code='{code}' Name='{name}'")
            
            # OPTIMIZATION 2: Bulk create products in chunks
            chunk_size = 50
            product_codes = list(unique_products.keys())
            
            for i in range(0, len(product_codes), chunk_size):
                chunk_codes = product_codes[i:i + chunk_size]

                # Check existing products in batch
                existing_result = self.admin_client.table(self._table('products')).select('id, code').in_('code', chunk_codes).execute()
                existing_codes = {p['code']: p['id'] for p in existing_result.data}

                # Create missing products
                new_products = []
                for code in chunk_codes:
                    if code not in existing_codes:
                        product_data = {
                            'code': code,
                            'name': unique_products[code],
                            'created_at': datetime.now().isoformat()
                        }
                        new_products.append(product_data)
                        logging.info(f"DEBUG Creating product: {code} -> '{unique_products[code]}'")

                if new_products:
                    logging.info(f"Creating {len(new_products)} new products...")
                    result = self.admin_client.table(self._table('products')).insert(new_products).execute()
                    for product in result.data:
                        existing_codes[product['code']] = product['id']
                
                # Update cache
                for code in chunk_codes:
                    if code in existing_codes:
                        cache_key = f"{code}_{unique_products[code]}"
                        self.product_cache[cache_key] = existing_codes[code]
                
                logging.info(f"Processed product chunk {i//chunk_size + 1}/{(len(product_codes) + chunk_size - 1)//chunk_size}")
            
            # OPTIMIZATION 3: Process transactions in larger batches
            transactions_created = 0
            batch_size = 500  # Larger batch size
            transactions_batch = []
            processed_rows = 0
            
            for _, row in cleaned_df.iterrows():
                try:
                    codigo = str(row.get('Código', row.get('Artículo', ''))).strip()
                    if not codigo or codigo == 'nan':
                        continue
                    
                    # Get product ID from cache
                    cache_key = f"{codigo}_{unique_products.get(codigo, '')}"
                    product_id = self.product_cache.get(cache_key)
                    if not product_id:
                        continue
                    
                    # Process each numeric column as a transaction
                    for col in cleaned_df.columns:
                        if col in ['Código', 'Artículo', 'Descripción']:
                            continue
                        
                        value = row.get(col)
                        if pd.isna(value) or value == 0:
                            continue
                        
                        # Create transaction data with date range fields
                        transaction_data = {
                            'store_id': store_id,
                            'product_id': product_id,
                            'type': file_type.lower(),
                            'quantity': float(value),
                            'price': 0.0,
                            'business_date_start': date_info['start_date'].isoformat() if date_info['start_date'] else None,
                            'business_date_end': date_info['end_date'].isoformat() if date_info['end_date'] else None,
                            'date_source': date_info['source'] or 'upload_time'
                        }
                        
                        # Validate data
                        validated_data = self._validate_transaction_data(transaction_data)
                        transactions_batch.append(validated_data)

                        # Insert batch when full
                        if len(transactions_batch) >= batch_size:
                            result = self.admin_client.table(self._table('transactions')).insert(transactions_batch).execute()
                            if result.data:
                                transactions_created += len(result.data)
                            transactions_batch = []
                            logging.info(f"Inserted batch, total transactions: {transactions_created}")
                
                except Exception as e:
                    logging.error(f"Error processing row {processed_rows}: {e}")
                    continue
                
                processed_rows += 1
                # Progress logging every 100 rows
                if processed_rows % 100 == 0:
                    logging.info(f"Processed {processed_rows}/{len(cleaned_df)} rows ({processed_rows/len(cleaned_df)*100:.1f}%)")
            
            # Insert remaining transactions
            if transactions_batch:
                result = self.admin_client.table(self._table('transactions')).insert(transactions_batch).execute()
                if result.data:
                    transactions_created += len(result.data)
                logging.info(f"Inserted final batch, total transactions: {transactions_created}")
            
            logging.info(f"✅ Successfully processed {transactions_created} transactions for store: {store_name}")
            return store_id, store_name, transactions_created
            
        except Exception as e:
            logging.error(f"Error processing dataframe: {e}")
            raise

# Factory function
def create_database_manager() -> DatabaseInterface:
    """Create appropriate database manager based on environment"""
    return SupabaseDatabase()
