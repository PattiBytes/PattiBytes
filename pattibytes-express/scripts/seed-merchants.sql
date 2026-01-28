-- Insert sample merchants
INSERT INTO merchants (
  id,
  owner_id,
  user_id,
  business_name,
  description,
  cuisine_type,
  address,
  latitude,
  longitude,
  phone,
  email,
  banner_url,
  logo_url,
  is_active,
  is_verified,
  rating,
  total_orders
) VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE role = 'merchant' LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'merchant' LIMIT 1),
    'Punjab Dhaba',
    'Authentic Punjabi cuisine with traditional flavors',
    ARRAY['Punjabi', 'North Indian', 'Vegetarian'],
    '{"address": "Model Town, Ludhiana, Punjab", "latitude": 30.9010, "longitude": 75.8573}',
    30.9010,
    75.8573,
    '+91 9876543210',
    'punjabdhaba@example.com',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
    NULL,
    true,
    true,
    4.5,
    150
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE role = 'merchant' LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'merchant' LIMIT 1),
    'Pizza Paradise',
    'Italian pizzas with fresh ingredients',
    ARRAY['Italian', 'Pizza', 'Fast Food'],
    '{"address": "Civil Lines, Ludhiana, Punjab", "latitude": 30.9100, "longitude": 75.8500}',
    30.9100,
    75.8500,
    '+91 9876543211',
    'pizzaparadise@example.com',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    NULL,
    true,
    true,
    4.7,
    200
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE role = 'merchant' LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'merchant' LIMIT 1),
    'Burger Hub',
    'Juicy burgers and crispy fries',
    ARRAY['American', 'Fast Food', 'Burgers'],
    '{"address": "PAU, Ludhiana, Punjab", "latitude": 30.9000, "longitude": 75.8600}',
    30.9000,
    75.8600,
    '+91 9876543212',
    'burgerhub@example.com',
    'https://images.unsplash.com/photo-1550547660-d9450f859349',
    NULL,
    true,
    true,
    4.3,
    180
  );

-- Insert sample menu items
INSERT INTO menu_items (
  merchant_id,
  name,
  description,
  price,
  category,
  image_url,
  is_available,
  is_veg
)
SELECT 
  m.id,
  'Butter Chicken',
  'Creamy tomato-based curry with tender chicken',
  320,
  'Main Course',
  'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398',
  true,
  false
FROM merchants m
WHERE m.business_name = 'Punjab Dhaba';

INSERT INTO menu_items (
  merchant_id,
  name,
  description,
  price,
  category,
  image_url,
  is_available,
  is_veg
)
SELECT 
  m.id,
  'Margherita Pizza',
  'Classic pizza with fresh mozzarella and basil',
  250,
  'Main Course',
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
  true,
  true
FROM merchants m
WHERE m.business_name = 'Pizza Paradise';

INSERT INTO menu_items (
  merchant_id,
  name,
  description,
  price,
  category,
  image_url,
  is_available,
  is_veg
)
SELECT 
  m.id,
  'Classic Burger',
  'Beef patty with lettuce, tomato, and special sauce',
  180,
  'Main Course',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
  true,
  false
FROM merchants m
WHERE m.business_name = 'Burger Hub';
