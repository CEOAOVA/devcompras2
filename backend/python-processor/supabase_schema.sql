-- Supabase Database Schema for Embler Autopartes Analytics
-- Run this in your Supabase SQL Editor

-- Create profiles table for user authentication
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    store_id INTEGER REFERENCES stores(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_uploads_store_id ON uploads(store_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for authenticated users
CREATE POLICY "Users can view all stores" ON stores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert stores" ON stores FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view all products" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert products" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update products" ON products FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view all uploads" ON uploads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert uploads" ON uploads FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view all transactions" ON transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert transactions" ON transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 'employee');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


  -- Add missing columns to uploads table
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS records_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processed';

-- Update existing records if any
UPDATE uploads SET 
    file_size = 0,
    records_processed = 0,
    status = 'processed'
WHERE file_size IS NULL OR records_processed IS NULL OR status IS NULL;

-- Add index for status column
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'uploads' 
ORDER BY ordinal_position;

