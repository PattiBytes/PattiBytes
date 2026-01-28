-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text UNIQUE,
  avatar_url text,
  role text NOT NULL CHECK (role IN ('customer', 'merchant', 'driver', 'admin')),
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  is_email_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ADDRESSES TABLE
-- ============================================
CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label text,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text,
  latitude float8,
  longitude float8,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses" ON addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX addresses_user_id_idx ON addresses(user_id);
CREATE INDEX addresses_location_idx ON addresses(latitude, longitude);

-- ============================================
-- MERCHANTS TABLE
-- ============================================
CREATE TABLE merchants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('restaurant', 'cafe', 'bakery', 'juice_bar', 'fast_food')),
  cuisine_types text[] DEFAULT '{}',
  description text,
  logo_url text,
  banner_url text,
  phone text,
  email text,
  latitude float8,
  longitude float8,
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  average_rating float8 DEFAULT 0,
  total_reviews integer DEFAULT 0,
  delivery_radius_km float8 DEFAULT 5,
  min_order_amount float8 DEFAULT 0,
  estimated_prep_time integer DEFAULT 30,
  commission_rate float8 DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own data" ON merchants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Merchants can update own data" ON merchants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public can view active merchants" ON merchants
  FOR SELECT USING (is_active = true AND is_verified = true);

CREATE INDEX merchants_location_idx ON merchants(latitude, longitude);
CREATE INDEX merchants_active_idx ON merchants(is_active, is_verified);

-- ============================================
-- OPERATING HOURS TABLE
-- ============================================
CREATE TABLE operating_hours (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time,
  close_time time,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view operating hours" ON operating_hours
  FOR SELECT USING (true);

CREATE INDEX operating_hours_merchant_idx ON operating_hours(merchant_id);

-- ============================================
-- MENU CATEGORIES TABLE
-- ============================================
CREATE TABLE menu_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active categories" ON menu_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Merchants can manage own categories" ON menu_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM merchants 
      WHERE merchants.id = menu_categories.merchant_id 
      AND merchants.user_id = auth.uid()
    )
  );

CREATE INDEX menu_categories_merchant_idx ON menu_categories(merchant_id);

-- ============================================
-- MENU ITEMS TABLE
-- ============================================
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price float8 NOT NULL,
  image_url text,
  is_veg boolean DEFAULT true,
  is_available boolean DEFAULT true,
  preparation_time integer DEFAULT 15,
  customization_options jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view available items" ON menu_items
  FOR SELECT USING (is_available = true);

CREATE POLICY "Merchants can manage own items" ON menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM merchants 
      WHERE merchants.id = menu_items.merchant_id 
      AND merchants.user_id = auth.uid()
    )
  );

CREATE INDEX menu_items_merchant_idx ON menu_items(merchant_id);
CREATE INDEX menu_items_category_idx ON menu_items(category_id);
CREATE INDEX menu_items_available_idx ON menu_items(is_available);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  items jsonb NOT NULL,
  subtotal float8 NOT NULL,
  delivery_fee float8 DEFAULT 0,
  tax float8 DEFAULT 0,
  discount float8 DEFAULT 0,
  tip float8 DEFAULT 0,
  total float8 NOT NULL,
  delivery_address jsonb NOT NULL,
  special_instructions text,
  scheduled_time timestamptz,
  payment_method text CHECK (payment_method IN ('razorpay', 'stripe', 'cod', 'wallet')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Merchants can view restaurant orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM merchants 
      WHERE merchants.id = orders.merchant_id 
      AND merchants.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view assigned orders" ON orders
  FOR SELECT USING (auth.uid() = driver_id);

CREATE INDEX orders_customer_idx ON orders(customer_id);
CREATE INDEX orders_merchant_idx ON orders(merchant_id);
CREATE INDEX orders_driver_idx ON orders(driver_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_created_idx ON orders(created_at DESC);

-- ============================================
-- DRIVERS TABLE
-- ============================================
CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('bike', 'scooter', 'car')),
  vehicle_number text UNIQUE,
  license_number text UNIQUE,
  is_verified boolean DEFAULT false,
  is_available boolean DEFAULT false,
  current_latitude float8,
  current_longitude float8,
  average_rating float8 DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own profile" ON drivers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update own profile" ON drivers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX drivers_location_idx ON drivers(current_latitude, current_longitude);
CREATE INDEX drivers_available_idx ON drivers(is_available);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES profiles(id),
  merchant_rating float8,
  driver_rating float8,
  food_rating float8,
  comment text,
  images text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Customers can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE INDEX reviews_merchant_idx ON reviews(merchant_id);
CREATE INDEX reviews_driver_idx ON reviews(driver_id);

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE favorites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX favorites_user_idx ON favorites(user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX notifications_user_idx ON notifications(user_id);
CREATE INDEX notifications_created_idx ON notifications(created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications(user_id, is_read);

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
