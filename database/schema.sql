-- eBURG POS System Database Schema
-- PostgreSQL / Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS order_product CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS cashier CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS customer CASCADE;
DROP TABLE IF EXISTS transaction_log CASCADE;

-- Customer Table
CREATE TABLE customer (
  customer_id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone_number VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Table
CREATE TABLE admin (
  admin_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL,
  full_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Cashier Table
CREATE TABLE cashier (
  cashier_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  full_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Category Table
CREATE TABLE category (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Table
CREATE TABLE product (
  product_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category_id INT REFERENCES category(category_id) ON DELETE SET NULL,
  image_url VARCHAR(255),
  item_code VARCHAR(50) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customer(customer_id) ON DELETE SET NULL,
  customer_name VARCHAR(100),
  order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  cashier_id INT REFERENCES cashier(cashier_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('Pending', 'In Preparation', 'Ready for Pickup', 'Completed', 'Cancelled'))
);

-- OrderProduct Table (Junction Table)
CREATE TABLE order_product (
  order_product_id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Table
CREATE TABLE payment (
  payment_id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid >= 0),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'Completed',
  transaction_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('Cash', 'Card', 'GCash', 'PayMaya', 'Other')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('Pending', 'Completed', 'Failed', 'Refunded'))
);

-- Inventory Table
CREATE TABLE inventory (
  item_id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
  ingredient VARCHAR(100) NOT NULL,
  admin_id INT REFERENCES admin(admin_id) ON DELETE SET NULL,
  quantity_in_stock INT NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
  minimum_threshold INT DEFAULT 10 CHECK (minimum_threshold >= 0),
  last_restock_date TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Log Table
CREATE TABLE activity_log (
  log_id SERIAL PRIMARY KEY,
  user_id INT,
  user_type VARCHAR(20),
  action_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id INT,
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_user_type CHECK (user_type IN ('Admin', 'Cashier'))
);

-- Create indexes for better performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_cashier_id ON orders(cashier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_order_product_order_id ON order_product(order_id);
CREATE INDEX idx_order_product_product_id ON order_product(product_id);
CREATE INDEX idx_payment_order_id ON payment(order_id);
CREATE INDEX idx_product_category_id ON product(category_id);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id, user_type);
CREATE INDEX idx_activity_log_date ON activity_log(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customer_updated_at BEFORE UPDATE ON customer
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON product
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update inventory on order
CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Always deduct stock when order_product is inserted (order is confirmed)
    UPDATE inventory
    SET quantity_in_stock = GREATEST(0, quantity_in_stock - NEW.quantity),
        last_updated = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic inventory update
CREATE TRIGGER trigger_update_inventory
    AFTER INSERT ON order_product
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_order();

-- Create function to restore inventory on order cancellation
CREATE OR REPLACE FUNCTION restore_inventory_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- Restore stock when order is cancelled
    IF OLD.status != 'Cancelled' AND NEW.status = 'Cancelled' THEN
        UPDATE inventory i
        SET quantity_in_stock = quantity_in_stock + op.quantity,
            last_updated = CURRENT_TIMESTAMP
        FROM order_product op
        WHERE i.product_id = op.product_id
        AND op.order_id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for inventory restoration
CREATE TRIGGER trigger_restore_inventory
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION restore_inventory_on_cancel();

-- Create view for low stock items
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
    p.product_id,
    p.name,
    p.item_code,
    c.name as category_name,
    i.quantity_in_stock,
    i.minimum_threshold,
    i.last_restock_date,
    (i.minimum_threshold - i.quantity_in_stock) as shortage_amount
FROM product p
JOIN inventory i ON p.product_id = i.product_id
LEFT JOIN category c ON p.category_id = c.category_id
WHERE i.quantity_in_stock <= i.minimum_threshold
AND p.is_active = TRUE
ORDER BY i.quantity_in_stock ASC;

-- Create view for sales summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
    DATE(order_date) as sale_date,
    COUNT(order_id) as total_orders,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as average_order_value,
    COUNT(DISTINCT customer_id) as unique_customers
FROM orders
WHERE status = 'Completed'
GROUP BY DATE(order_date)
ORDER BY sale_date DESC;

-- Create view for product sales performance
CREATE OR REPLACE VIEW product_sales_performance AS
SELECT 
    p.product_id,
    p.name,
    p.item_code,
    c.name as category_name,
    COUNT(op.order_product_id) as times_ordered,
    SUM(op.quantity) as total_quantity_sold,
    SUM(op.subtotal) as total_revenue,
    AVG(op.unit_price) as average_price
FROM product p
LEFT JOIN order_product op ON p.product_id = op.product_id
LEFT JOIN orders o ON op.order_id = o.order_id
LEFT JOIN category c ON p.category_id = c.category_id
WHERE o.status = 'Completed' OR o.status IS NULL
GROUP BY p.product_id, p.name, p.item_code, c.name
ORDER BY total_quantity_sold DESC NULLS LAST;

-- ============================================
-- TRANSACTION MANAGEMENT SYSTEM
-- ============================================

-- Create transaction log table for monitoring and auditing
CREATE TABLE transaction_log (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id INT REFERENCES cashier(cashier_id),
    operation_type VARCHAR(50), -- 'order_process', 'inventory_update', 'user_management'
    order_id INT REFERENCES orders(order_id),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20), -- 'committed', 'rolled_back', 'failed'
    affected_tables TEXT[],
    error_message TEXT,
    transaction_data JSONB
);

-- Create index for transaction log performance
CREATE INDEX idx_transaction_log_cashier ON transaction_log(cashier_id);
CREATE INDEX idx_transaction_log_start_time ON transaction_log(start_time);

-- Create transaction function for atomic order processing
CREATE OR REPLACE FUNCTION process_complete_order(
    customer_name_param VARCHAR(100),
    order_items_param JSONB,
    payment_info_param JSONB DEFAULT NULL,
    cashier_id_param INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    new_order_id INT;
    total_amount DECIMAL(10,2) := 0;
    order_item RECORD;
    current_stock INT;
    result JSONB;
    transaction_log_id UUID;
BEGIN
    -- Start explicit transaction with proper isolation to prevent concurrent inventory conflicts
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

    -- Log transaction start
    SELECT log_transaction_activity(
        cashier_id_param,
        'order_process',
        NULL::INT,
        'started',
        ARRAY['orders', 'order_product', 'inventory', 'payment'],
        NULL,
        jsonb_build_object('customer_name', customer_name_param, 'item_count', jsonb_array_length(order_items_param))
    ) INTO transaction_log_id;

    BEGIN
        -- 1. Validate inventory availability first for all items
        FOR order_item IN SELECT * FROM jsonb_array_elements(order_items_param)
        LOOP
            -- Check if product exists and is active
            IF NOT EXISTS (
                SELECT 1 FROM product
                WHERE product_id = (order_item.value->>'product_id')::INT
                AND is_active = TRUE
            ) THEN
                RAISE EXCEPTION 'Product ID % does not exist or is inactive', (order_item.value->>'product_id');
            END IF;

            -- Check inventory stock for all ingredients of this product
            -- Ensure all ingredients have sufficient stock
            IF NOT EXISTS (
                SELECT 1 FROM inventory
                WHERE product_id = (order_item.value->>'product_id')::INT
            ) THEN
                RAISE EXCEPTION 'No inventory record found for product ID %', (order_item.value->>'product_id');
            END IF;

            -- Check if any ingredient has insufficient stock
            IF EXISTS (
                SELECT 1 FROM inventory
                WHERE product_id = (order_item.value->>'product_id')::INT
                AND quantity_in_stock < (order_item.value->>'quantity')::INT
            ) THEN
                RAISE EXCEPTION 'Insufficient stock for product ID %. One or more ingredients are out of stock.',
                    (order_item.value->>'product_id');
            END IF;

            -- Calculate total amount
            total_amount := total_amount + (
                (order_item.value->>'unit_price')::DECIMAL(10,2) *
                (order_item.value->>'quantity')::INT
            );
        END LOOP;

        -- 2. Create order record
        INSERT INTO orders (
            customer_name,
            total_amount,
            status,
            cashier_id,
            order_date
        ) VALUES (
            customer_name_param,
            total_amount,
            'Pending', -- Will be updated to 'Completed' at the end
            cashier_id_param,
            CURRENT_TIMESTAMP
        ) RETURNING order_id INTO new_order_id;

        -- 3. Insert order items
        FOR order_item IN SELECT * FROM jsonb_array_elements(order_items_param)
        LOOP
            INSERT INTO order_product (
                order_id,
                product_id,
                quantity,
                unit_price
            ) VALUES (
                new_order_id,
                (order_item.value->>'product_id')::INT,
                (order_item.value->>'quantity')::INT,
                (order_item.value->>'unit_price')::DECIMAL(10,2)
            );
        END LOOP;

        -- 4. Deduct inventory atomically (this will trigger the existing inventory update function)
        -- The trigger_update_inventory trigger will handle this automatically when order_product records are inserted

        -- 5. Process payment if payment info is provided
        IF payment_info_param IS NOT NULL THEN
            INSERT INTO payment (
                order_id,
                payment_date,
                amount_paid,
                payment_method,
                payment_status
            ) VALUES (
                new_order_id,
                CURRENT_TIMESTAMP,
                (payment_info_param->>'amount_paid')::DECIMAL(10,2),
                COALESCE(payment_info_param->>'payment_method', 'Cash'),
                'Completed'
            );
        END IF;

        -- 6. Update order status to 'Completed'
        UPDATE orders
        SET status = 'Completed'
        WHERE order_id = new_order_id;

        -- Update transaction log with success
        UPDATE transaction_log
        SET status = 'committed',
            order_id = new_order_id,
            transaction_data = jsonb_build_object(
                'customer_name', customer_name_param,
                'item_count', jsonb_array_length(order_items_param),
                'total_amount', total_amount,
                'order_id', new_order_id
            )
        WHERE transaction_id = transaction_log_id;

        -- Success response
        result := jsonb_build_object(
            'success', true,
            'order_id', new_order_id,
            'total_amount', total_amount,
            'transaction_id', transaction_log_id,
            'message', 'Order processed successfully'
        );

        RETURN result;

    EXCEPTION WHEN OTHERS THEN
        -- Log transaction failure
        UPDATE transaction_log
        SET status = 'rolled_back',
            error_message = SQLERRM,
            transaction_data = jsonb_build_object(
                'customer_name', customer_name_param,
                'item_count', jsonb_array_length(order_items_param),
                'error_details', SQLERRM
            )
        WHERE transaction_id = transaction_log_id;

        -- Automatic rollback on any error
        RAISE EXCEPTION 'Order processing failed: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create function to log transaction activities
CREATE OR REPLACE FUNCTION log_transaction_activity(
    cashier_id_param INT,
    operation_type_param VARCHAR(50),
    order_id_param INT,
    status_param VARCHAR(20),
    affected_tables_param TEXT[] DEFAULT NULL,
    error_message_param TEXT DEFAULT NULL,
    transaction_data_param JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO transaction_log (
        cashier_id,
        operation_type,
        order_id,
        status,
        end_time,
        affected_tables,
        error_message,
        transaction_data
    ) VALUES (
        cashier_id_param,
        operation_type_param,
        order_id_param,
        status_param,
        CURRENT_TIMESTAMP,
        affected_tables_param,
        error_message_param,
        transaction_data_param
    ) RETURNING transaction_id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your Supabase setup)
-- These are examples - configure based on your RLS policies

COMMENT ON TABLE customer IS 'Stores customer information';
COMMENT ON TABLE admin IS 'Stores admin/manager user accounts';
COMMENT ON TABLE cashier IS 'Stores cashier user accounts';
COMMENT ON TABLE category IS 'Product categories';
COMMENT ON TABLE product IS 'Product catalog';
COMMENT ON TABLE orders IS 'Customer orders';
COMMENT ON TABLE order_product IS 'Order line items';
COMMENT ON TABLE payment IS 'Payment transactions';
COMMENT ON TABLE inventory IS 'Product inventory levels';
COMMENT ON TABLE activity_log IS 'System activity audit log';
COMMENT ON TABLE transaction_log IS 'Transaction monitoring and audit trail';
