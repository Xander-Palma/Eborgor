-- ============================================
-- MINUTE BURGER COMPLETE MENU - REAL DATA
-- ============================================

-- Clean existing data
DELETE FROM activity_log;
DELETE FROM payment;
DELETE FROM order_product;
DELETE FROM orders;
DELETE FROM inventory;
DELETE FROM product;
DELETE FROM category;
DELETE FROM customer;
DELETE FROM cashier;
DELETE FROM admin;

-- Reset sequences
ALTER SEQUENCE IF EXISTS category_category_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS product_product_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS admin_admin_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS cashier_cashier_id_seq RESTART WITH 1;

-- Insert Admin Account
INSERT INTO admin (username, password_hash, email, full_name) VALUES
('admin', 'admin123', 'admin@minuteburger.com', 'System Administrator');

-- Insert Cashier Account
INSERT INTO cashier (username, password_hash, email, full_name) VALUES
('cashier', 'cashier123', 'cashier@minuteburger.com', 'Maria Santos');

-- Insert Categories
INSERT INTO category (name, description, display_order) VALUES
('Premium Steakburger', 'Premium quality steakburgers', 1),
('Big Time Burgers', 'Our signature big burgers', 2),
('Sandwiches', 'Specialty sandwiches', 3),
('Sulit Sandwiches', 'Value sandwiches', 4),
('Chicken Time Sandwiches', 'Chicken sandwiches', 5),
('Hotdogs', 'Hotdog varieties', 6),
('Drinks', 'Beverages', 7),
('Extras', 'Add-ons and sides', 8);

-- Insert Products
INSERT INTO product (name, description, price, category_id, item_code, image_url) VALUES
-- Premium Steakburger
('Premium Steakburger', 'Buy 1 Take 1', 142.00, 1, 'PSB001', '/images/premium-steakburger.jpg'),

-- Big Time Burgers
('Bacon Cheese Burger', 'Buy 1 Take 1 - Big Time Burgers', 97.00, 2, 'BTB001', '/images/bacon-cheese-burger.jpg'),
('Black Pepper Burger', 'Buy 1 Take 1 - Big Time Burgers', 90.00, 2, 'BTB002', '/images/black-pepper-burger.jpg'),

-- Sandwiches
('Crispy Chicken Chimichurri Burger', 'Buy 1 Take 1', 101.00, 3, 'SND001', '/images/chicken-chimichurri.jpg'),
('Beef Shawarma Burger', 'Buy 1 Take 1', 92.00, 3, 'SND002', '/images/beef-shawarma.jpg'),
('Crispy Chicken Roasted Sesame Burger', 'Buy 1 Take 1', 95.00, 3, 'SND003', '/images/chicken-sesame.jpg'),
('50/50 Veggie Chicken Burger', 'Buy 1 Take 1', 87.00, 3, 'SND004', '/images/veggie-chicken.jpg'),

-- Sulit Sandwiches
('Minute Burger', 'Buy 1 Take 1 - Sulit Sandwiches', 42.00, 4, 'SLT001', '/images/minute-burger.jpg'),
('Cheesy Burger', 'Buy 1 Take 1 - Sulit Sandwiches', 52.00, 4, 'SLT002', '/images/cheesy-burger.jpg'),
('Chili Cheesy Burger', 'Buy 1 Take 1 - Sulit Sandwiches', 52.00, 4, 'SLT003', '/images/chili-cheesy.jpg'),
('Double Minute Burger', 'Buy 1 Take 1 - Sulit Sandwiches', 65.00, 4, 'SLT004', '/images/double-minute.jpg'),
('Double Cheesy Burger', 'Buy 1 Take 1 - Sulit Sandwiches', 81.00, 4, 'SLT005', '/images/double-cheesy.jpg'),
('Double Chili Cheesy Burger', 'Buy 1 Take 1 - Sulit Sandwiches', 81.00, 4, 'SLT006', '/images/double-chili-cheesy.jpg'),

-- Chicken Time Sandwiches
('Chicken Time', 'Buy 1 Take 1', 51.00, 5, 'CHK001', '/images/chicken-time.jpg'),
('Double Chicken Time', 'Buy 1 Take 1', 71.00, 5, 'CHK002', '/images/double-chicken-time.jpg'),

-- Hotdogs
('Chili Con Cheese Franks', 'Buy 1 Take 1', 97.00, 6, 'HTD001', '/images/chili-con-cheese.jpg'),
('French Onion Franks', 'Buy 1 Take 1', 95.00, 6, 'HTD002', '/images/french-onion.jpg'),
('Cheesydog', 'Buy 1 Take 1', 50.00, 6, 'HTD003', '/images/cheesydog.jpg'),

-- Drinks
('Calamantea', 'Refreshing calamansi tea', 25.00, 7, 'DRK001', '/images/calamantea.jpg'),
('Iced Choco', 'Iced chocolate drink', 24.00, 7, 'DRK002', '/images/iced-choco.jpg'),
('Iced Mocha', 'Iced mocha coffee', 26.00, 7, 'DRK003', '/images/iced-mocha.jpg'),
('Hot Coffee', 'Freshly brewed coffee', 18.00, 7, 'DRK004', '/images/hot-coffee.jpg'),
('Hot Choco', 'Hot chocolate', 20.00, 7, 'DRK005', '/images/hot-choco.jpg'),
('Hot Mocha', 'Hot mocha coffee', 20.00, 7, 'DRK006', '/images/hot-mocha.jpg'),
('Bottled Water', 'Purified water', 16.00, 7, 'DRK007', '/images/water.jpg'),
('Krazy Milk Tea', 'Milk tea', 30.00, 7, 'DRK008', '/images/milk-tea.jpg'),

-- Extras
('Cheesy Carne Nachos', 'Nachos with cheese and meat', 52.00, 8, 'EXT001', '/images/nachos.jpg'),
('Egg', 'Add egg to any burger', 16.00, 8, 'EXT002', '/images/egg.jpg'),
('Supreme Cheese', 'Extra cheese', 14.00, 8, 'EXT003', '/images/cheese.jpg'),
('Coleslaw', 'Fresh coleslaw', 13.00, 8, 'EXT004', '/images/coleslaw.jpg');

-- Insert Inventory for ingredients
-- Premium Steakburger ingredients
INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Steakburger patty', 1, 40, 10, CURRENT_TIMESTAMP FROM product WHERE name = 'Premium Steakburger';

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Bun', 1, 200, 50, CURRENT_TIMESTAMP FROM product WHERE name = 'Premium Steakburger';

-- Big Time Burgers ingredients
INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Beef patty', 1, 40, 10, CURRENT_TIMESTAMP FROM product WHERE name IN ('Bacon Cheese Burger', 'Black Pepper Burger');

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Bun', 1, 200, 50, CURRENT_TIMESTAMP FROM product WHERE name IN ('Bacon Cheese Burger', 'Black Pepper Burger');

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Cheese', 1, 100, 25, CURRENT_TIMESTAMP FROM product WHERE name = 'Bacon Cheese Burger';

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Bacon', 1, 80, 20, CURRENT_TIMESTAMP FROM product WHERE name = 'Bacon Cheese Burger';

-- Sandwiches ingredients
INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Chicken patty', 1, 40, 10, CURRENT_TIMESTAMP FROM product WHERE name IN ('Crispy Chicken Chimichurri Burger', 'Crispy Chicken Roasted Sesame Burger', '50/50 Veggie Chicken Burger');

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Beef patty', 1, 40, 10, CURRENT_TIMESTAMP FROM product WHERE name = 'Beef Shawarma Burger';

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Bun', 1, 200, 50, CURRENT_TIMESTAMP FROM product WHERE category_id = 3;

-- Sulit Sandwiches ingredients
INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Beef patty', 1, 60, 15, CURRENT_TIMESTAMP FROM product WHERE category_id = 4;

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Bun', 1, 200, 50, CURRENT_TIMESTAMP FROM product WHERE category_id = 4;

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Cheese', 1, 100, 25, CURRENT_TIMESTAMP FROM product WHERE name LIKE '%Cheesy%' AND category_id = 4;

-- Chicken Time Sandwiches ingredients
INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Chicken patty', 1, 60, 15, CURRENT_TIMESTAMP FROM product WHERE category_id = 5;

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Bun', 1, 200, 50, CURRENT_TIMESTAMP FROM product WHERE category_id = 5;

-- Hotdogs ingredients
INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Hotdog', 1, 50, 12, CURRENT_TIMESTAMP FROM product WHERE category_id = 6;

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Bun', 1, 200, 50, CURRENT_TIMESTAMP FROM product WHERE category_id = 6;

INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, 'Cheese', 1, 100, 25, CURRENT_TIMESTAMP FROM product WHERE name LIKE '%Cheese%' AND category_id = 6;

-- Drinks (use product name as ingredient)
INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, name, 1, 100, 20, CURRENT_TIMESTAMP FROM product WHERE category_id = 7;

-- Extras (use product name as ingredient)
INSERT INTO inventory (product_id, ingredient, admin_id, quantity_in_stock, minimum_threshold, last_restock_date)
SELECT product_id, name, 1, 80, 15, CURRENT_TIMESTAMP FROM product WHERE category_id = 8;

-- Verify data
SELECT 'SETUP COMPLETE!' as status;

SELECT 'Categories: ' || COUNT(*)::text as summary FROM category
UNION ALL
SELECT 'Products: ' || COUNT(*)::text FROM product
UNION ALL
SELECT 'Inventory: ' || COUNT(*)::text FROM inventory
UNION ALL
SELECT 'Admin: 1' 
UNION ALL
SELECT 'Cashier: 1';

SELECT 'LOGIN CREDENTIALS:' as info;
SELECT 'Cashier: cashier / cashier123' as credentials
UNION ALL
SELECT 'Manager: admin / admin123';
