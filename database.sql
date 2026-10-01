-- database.sql
-- Run this script in phpMyAdmin to set up the database and sample data

CREATE DATABASE IF NOT EXISTS inventory_system;
USE inventory_system;

-- 1. Users Table (Admin and Staff)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 4. Orders Table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    shipping_address TEXT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Order Items Table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price_at_time DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 6. Stock Logs Table
CREATE TABLE stock_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_change INT NOT NULL,
    reason ENUM('order', 'cancel', 'manual adjust', 'restock') NOT NULL,
    user_id INT NULL, -- NULL if customer order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. Alerts Table
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    alert_level ENUM('Low', 'Critical', 'Out of stock') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 8. Email Logs Table (For demonstration without SMTP)
CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INSERT SAMPLE DATA
-- ==========================================

-- Default passwords are 'admin123' and 'staff123' (hashed using BCRYPT)
-- To generate in PHP: password_hash('admin123', PASSWORD_DEFAULT)
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2y$10$yFwA49y1yWjQcRXY.FmH5eV/r/dY5qU6U9a2N2x2CqW498vX0xZzK', 'admin'),
('staff', '$2y$10$qV9w.g2/0wA29Qy8B84H4eaX/lO6vN7tL1sK7Ew0C.h4K9r/M/4Wq', 'staff');

INSERT INTO categories (name, description) VALUES
('Electronics', 'Gadgets and devices'),
('Office Supplies', 'Stationery and office tools'),
('Furniture', 'Office and home furniture'),
('Apparel', 'Clothing and accessories'),
('Books', 'Educational and reading materials');

-- 20 Products
INSERT INTO products (sku, category_id, name, description, price, stock, low_stock_threshold) VALUES
('ELC-001', 1, 'Wireless Mouse', 'Ergonomic optical mouse', 2000.00, 50, 10),
('ELC-002', 1, 'Mechanical Keyboard', 'RGB backlighting', 6000.00, 5, 10), -- Critical stock
('ELC-003', 1, '24-inch Monitor', '1080p LED display', 12000.00, 0, 5), -- Out of stock
('ELC-004', 1, 'USB-C Hub', '7-in-1 adapter', 2400.00, 15, 10),
('OFS-001', 2, 'A4 Paper Ream', '500 sheets white', 400.00, 100, 20),
('OFS-002', 2, 'Gel Pens Set', '10 colors', 680.00, 8, 15), -- Low stock
('OFS-003', 2, 'Stapler', 'Heavy duty', 960.00, 40, 5),
('OFS-004', 2, 'Whiteboard Markers', 'Pack of 4', 360.00, 2, 10), -- Critical stock
('FUR-001', 3, 'Ergonomic Chair', 'Lumbar support', 16000.00, 20, 5),
('FUR-002', 3, 'Standing Desk', 'Adjustable height', 28000.00, 3, 5), -- Low/Critical stock
('FUR-003', 3, 'Bookshelf', '5 tiers wooden', 6400.00, 12, 5),
('APP-001', 4, 'College Hoodie', 'Cotton blend, Size L', 3200.00, 60, 10),
('APP-002', 4, 'Cap', 'Adjustable baseball cap', 1200.00, 10, 10), -- Low stock
('APP-003', 4, 'Backpack', 'Water resistant', 3600.00, 0, 5), -- Out of stock
('BKS-001', 5, 'Web Tech Textbook', '5th Edition', 4800.00, 25, 5),
('BKS-002', 5, 'Data Structures', 'C++ and Java', 4400.00, 30, 5),
('BKS-003', 5, 'Clean Code', 'Software craftsmanship', 3600.00, 8, 10), -- Low stock
('BKS-004', 5, 'Design Patterns', 'GoF', 4000.00, 15, 5),
('ELC-005', 1, 'Bluetooth Speaker', 'Portable waterproof', 2800.00, 50, 10),
('OFS-005', 2, 'Sticky Notes', '3x3 inches, 100 sheets', 160.00, 200, 30);

-- Insert sample orders spread over last 30 days
INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, total_amount, status, created_at) VALUES
('Alice Smith', 'alice@example.com', '1234567890', '123 Elm St', 6000.00, 'Delivered', DATE_SUB(NOW(), INTERVAL 25 DAY)),
('Bob Jones', 'bob@example.com', '0987654321', '456 Oak St', 12000.00, 'Shipped', DATE_SUB(NOW(), INTERVAL 15 DAY)),
('Charlie Brown', 'charlie@example.com', '1112223333', '789 Pine St', 3200.00, 'Processing', DATE_SUB(NOW(), INTERVAL 5 DAY)),
('Diana Prince', 'diana@example.com', '4445556666', '321 Maple St', 16000.00, 'Pending', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('Eve Adams', 'eve@example.com', '7778889999', '654 Birch St', 1360.00, 'Delivered', DATE_SUB(NOW(), INTERVAL 20 DAY)),
('Frank Castle', 'frank@example.com', '2223334444', '987 Cedar St', 680.00, 'Cancelled', DATE_SUB(NOW(), INTERVAL 10 DAY));

-- Order Items
INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES
(1, 1, 1, 2000.00), (1, 18, 1, 4000.00),
(2, 3, 1, 12000.00),
(3, 12, 1, 3200.00),
(4, 9, 1, 16000.00),
(5, 6, 2, 680.00),
(6, 6, 1, 680.00);

-- Stock Logs (for the sample orders)
INSERT INTO stock_logs (product_id, quantity_change, reason, created_at) VALUES
(1, -1, 'order', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(18, -1, 'order', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(3, -1, 'order', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(12, -1, 'order', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(9, -1, 'order', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6, -2, 'order', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(6, -1, 'order', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(6, 1, 'cancel', DATE_SUB(NOW(), INTERVAL 9 DAY)); -- Frank cancelled
