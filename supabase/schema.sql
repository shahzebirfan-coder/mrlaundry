-- ============================================
-- SPARKLEWASH LAUNDRY POS - SUPABASE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor: 
-- https://app.supabase.com/project/_/sql
-- ============================================

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT,
  location JSONB,
  membership_card TEXT,
  membership_tier TEXT DEFAULT 'none',
  photo_url TEXT,
  birthday DATE,
  total_spent NUMERIC DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  branch_id TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'received',
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  paid NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  is_express BOOLEAN DEFAULT false,
  delivery_preference TEXT DEFAULT 'fold',  -- 'hanger' or 'fold'
  notes TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expected_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  driver_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Employees Table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT,
  role TEXT NOT NULL,
  branch_id TEXT,
  salary NUMERIC DEFAULT 0,
  login_time TIMESTAMPTZ,
  logout_time TIMESTAMPTZ,
  orders_processed INTEGER DEFAULT 0,
  productivity_score INTEGER DEFAULT 0,
  photo_url TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  min_stock NUMERIC DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  supplier TEXT,
  branch_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  mobile TEXT,
  manager TEXT,
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Activities Table
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT
);

-- 7. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount INTEGER NOT NULL,
  valid_till TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER DEFAULT 100,
  active BOOLEAN DEFAULT true
);

-- 8. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  service_rating INTEGER,
  delivery_rating INTEGER,
  staff_rating INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vehicle TEXT,
  mobile TEXT,
  active BOOLEAN DEFAULT true,
  assigned_orders JSONB DEFAULT '[]'
);

-- 10. Settings Table (singleton)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  shop_name TEXT DEFAULT 'SparkleWash Laundry',
  shop_phone TEXT,
  shop_address TEXT,
  currency TEXT DEFAULT '₨',
  active_branch_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_settings CHECK (id = 1)
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Public access for now
-- For production, add proper auth policies!
-- ============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth required for demo)
-- ⚠️ For production: replace with proper auth policies
CREATE POLICY "Allow all" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all" ON inventory FOR ALL USING (true);
CREATE POLICY "Allow all" ON branches FOR ALL USING (true);
CREATE POLICY "Allow all" ON activities FOR ALL USING (true);
CREATE POLICY "Allow all" ON coupons FOR ALL USING (true);
CREATE POLICY "Allow all" ON feedback FOR ALL USING (true);
CREATE POLICY "Allow all" ON drivers FOR ALL USING (true);
CREATE POLICY "Allow all" ON settings FOR ALL USING (true);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ✅ DONE! Schema ready.
-- ============================================
