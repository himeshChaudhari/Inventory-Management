<?php
session_start();
require_once '../includes/db.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$role = $_SESSION['role'] ?? null;

function getJsonInput() {
    $raw = file_get_contents('php://input');
    return !empty($raw) ? json_decode($raw, true) : [];
}

// ==========================================
// PUBLIC STOREFRONT ENDPOINTS
// ==========================================
if ($action === 'get_store_categories') {
    echo json_encode($pdo->query("SELECT * FROM categories ORDER BY name ASC")->fetchAll());
    exit;
}

if ($action === 'get_store_products') {
    $cat_id = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    
    $query = "SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1";
    $params = [];
    if ($cat_id > 0) { 
        $query .= " AND p.category_id = ?"; 
        $params[] = $cat_id; 
    }
    if ($search !== '') { 
        $query .= " AND p.name LIKE ?"; 
        $params[] = "%$search%"; 
    }
    $query .= " ORDER BY p.name ASC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($action === 'place_order') {
    $data = getJsonInput();
    if (!$data || empty($data['cart']) || empty($data['customer'])) {
        echo json_encode(['success' => false, 'error' => 'Invalid order submission.']);
        exit;
    }

    $cust = $data['customer'];
    $cart = $data['cart'];

    $custName = trim($cust['name'] ?? '');
    $custEmail = strtolower(trim($cust['email'] ?? ''));
    $custPhone = trim($cust['phone'] ?? '');
    $custAddress = trim($cust['address'] ?? '');

    // 5 & 6. Server-side validation for Customer Phone and Email
    if ($custName === '' || $custAddress === '') {
        echo json_encode(['success' => false, 'error' => 'Please provide customer name and shipping address.']);
        exit;
    }

    if (!filter_var($custEmail, FILTER_VALIDATE_EMAIL) || strlen($custEmail) > 100) {
        echo json_encode(['success' => false, 'error' => 'Please enter a valid email address (example: name@gmail.com).']);
        exit;
    }

    if (!preg_match('/^[6-9][0-9]{9}$/', $custPhone)) {
        echo json_encode(['success' => false, 'error' => 'Phone number must be exactly 10 digits and start with 6, 7, 8 or 9.']);
        exit;
    }

    $total_amount = 0;
    $pdo->beginTransaction();
    try {
        foreach ($cart as $item) {
            $stmt = $pdo->prepare("SELECT stock, price, name FROM products WHERE id = ? FOR UPDATE");
            $stmt->execute([$item['id']]);
            $product = $stmt->fetch();
            if (!$product || $product['stock'] < $item['quantity']) {
                $pName = $product ? $product['name'] : 'Unknown Product';
                $pStock = $product ? $product['stock'] : 0;
                throw new Exception("Sorry, '{$pName}' only has {$pStock} units left in stock.");
            }
            $total_amount += ($product['price'] * $item['quantity']);
        }

        $stmt = $pdo->prepare("INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, total_amount, status) VALUES (?, ?, ?, ?, ?, 'Pending')");
        $stmt->execute([$custName, $custEmail, $custPhone, $custAddress, $total_amount]);
        $order_id = $pdo->lastInsertId();

        foreach ($cart as $item) {
            $p_stmt = $pdo->prepare("SELECT price, stock, low_stock_threshold FROM products WHERE id = ?");
            $p_stmt->execute([$item['id']]);
            $prod_data = $p_stmt->fetch();

            $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)")
                ->execute([$order_id, $item['id'], $item['quantity'], $prod_data['price']]);

            $new_stock = $prod_data['stock'] - $item['quantity'];
            $pdo->prepare("UPDATE products SET stock = ? WHERE id = ?")->execute([$new_stock, $item['id']]);
            
            $pdo->prepare("INSERT INTO stock_logs (product_id, quantity_change, reason, user_id) VALUES (?, ?, 'order', NULL)")
                ->execute([$item['id'], -$item['quantity']]);

            $thresh = (int)$prod_data['low_stock_threshold'];
            $alert_level = $new_stock == 0 ? 'Out of stock' : ($new_stock <= ($thresh / 2) ? 'Critical' : ($new_stock <= $thresh ? 'Low' : ''));
            if ($alert_level !== '') {
                $chk_alert = $pdo->prepare("SELECT id FROM alerts WHERE product_id = ? AND alert_level = ? AND is_read = 0");
                $chk_alert->execute([$item['id'], $alert_level]);
                if (!$chk_alert->fetch()) {
                    $pdo->prepare("INSERT INTO alerts (product_id, alert_level) VALUES (?, ?)")->execute([$item['id'], $alert_level]);
                }
            }
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'order_id' => $order_id]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================
if ($action === 'login') {
    $data = getJsonInput();
    $loginIdentifier = strtolower(trim($data['email'] ?? $data['username'] ?? ''));
    $password = $data['password'] ?? '';

    // 6. Email validation on login (allows legacy usernames 'admin' or 'staff')
    $isLegacy = in_array($loginIdentifier, ['admin', 'staff']);
    if (!$isLegacy && (!filter_var($loginIdentifier, FILTER_VALIDATE_EMAIL) || strlen($loginIdentifier) > 100)) {
        echo json_encode(['success' => false, 'error' => 'Please enter a valid email address (example: name@gmail.com).']);
        exit;
    }

    // Query by email or username with fallback if email column doesn't exist yet
    $user = null;
    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? OR username = ?");
        $stmt->execute([$loginIdentifier, $loginIdentifier]);
        $user = $stmt->fetch();
    } catch (\Exception $dbEx) {
        $usernameFallback = strpos($loginIdentifier, '@') !== false ? explode('@', $loginIdentifier)[0] : $loginIdentifier;
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$usernameFallback]);
        $user = $stmt->fetch();
    }

    if ($user && password_verify($password, $user['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        echo json_encode(['success' => true, 'role' => $user['role']]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid email or password.']);
    }
    exit;
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'check_session') {
    echo json_encode([
        'logged_in' => (bool)$role,
        'role' => $role,
        'username' => $_SESSION['username'] ?? ''
    ]);
    exit;
}

if (!$role) {
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ==========================================
// ADMIN ENDPOINTS
// ==========================================
if ($role === 'admin') {
    // 2. Fixed Sales Trend: full 7-day interval (including today) with zero-fill
    if ($action === 'get_analytics') {
        $revenue = $pdo->query("SELECT SUM(total_amount) FROM orders WHERE status != 'Cancelled'")->fetchColumn();

        // Query sales grouped by date for the last 6 days up to today (7 days total)
        $trendStmt = $pdo->query("SELECT DATE(created_at) as order_date, SUM(total_amount) as day_total FROM orders WHERE status != 'Cancelled' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at)");
        $salesByDate = [];
        while ($row = $trendStmt->fetch()) {
            $salesByDate[$row['order_date']] = (float)$row['day_total'];
        }

        // Fill all 7 continuous days with exact dates and 0 defaults
        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-$i days"));
            $trend[] = [
                'date' => $d,
                'total' => $salesByDate[$d] ?? 0.0
            ];
        }

        $best = $pdo->query("SELECT p.name, SUM(oi.quantity) as sold FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN orders o ON oi.order_id = o.id WHERE o.status != 'Cancelled' GROUP BY p.id ORDER BY sold DESC LIMIT 5")->fetchAll();
        $dead = $pdo->query("SELECT p.name, p.stock FROM products p WHERE p.is_active = 1 AND p.id NOT IN (SELECT oi.product_id FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))")->fetchAll();

        echo json_encode([
            'revenue' => (float)($revenue ?: 0),
            'trend' => $trend,
            'best' => $best,
            'dead' => $dead
        ]);
        exit;
    }

    if ($action === 'get_reorder') {
        $data = $pdo->query("SELECT p.id, p.name, p.stock, COALESCE(SUM(oi.quantity), 0) as total_sold_30d FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND o.status != 'Cancelled' WHERE p.is_active = 1 GROUP BY p.id")->fetchAll();
        $suggestions = [];
        foreach ($data as $row) {
            $avg_daily = $row['total_sold_30d'] / 30;
            $lead_time = 7;
            $safety_stock = 5;
            $reorder_point = ($avg_daily * $lead_time) + $safety_stock;
            if ($row['stock'] <= $reorder_point) {
                $suggestions[] = [
                    'name' => $row['name'],
                    'stock' => (int)$row['stock'],
                    'avg_daily' => round($avg_daily, 2),
                    'reorder_point' => (int)ceil($reorder_point),
                    'suggested_qty' => (int)ceil($reorder_point) - (int)$row['stock']
                ];
            }
        }
        echo json_encode($suggestions);
        exit;
    }

    if ($action === 'admin_stats') {
        echo json_encode([
            'products' => (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn(),
            'orders' => (int)$pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn(),
            'staff' => (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='staff'")->fetchColumn()
        ]);
        exit;
    }

    if ($action === 'add_category') {
        $data = getJsonInput();
        try {
            $stmt = $pdo->prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
            $stmt->execute([trim($data['name'] ?? ''), trim($data['desc'] ?? '')]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Category already exists.']);
        }
        exit;
    }

    if ($action === 'get_categories') {
        echo json_encode($pdo->query("SELECT * FROM categories ORDER BY name ASC")->fetchAll());
        exit;
    }

    if ($action === 'get_products') {
        echo json_encode($pdo->query("SELECT p.*, c.name as cat_name FROM products p JOIN categories c ON p.category_id = c.id ORDER BY p.id DESC")->fetchAll());
        exit;
    }

    // 4. Save Product (Required Image Upload with finfo verification)
    if ($action === 'save_product') {
        $isPost = !empty($_POST) || !empty($_FILES);
        $json = !$isPost ? getJsonInput() : [];

        $id = (int)($isPost ? ($_POST['id'] ?? 0) : ($json['id'] ?? 0));
        $sku = trim($isPost ? ($_POST['sku'] ?? '') : ($json['sku'] ?? ''));
        $name = trim($isPost ? ($_POST['name'] ?? '') : ($json['name'] ?? ''));
        $cat_id = (int)($isPost ? ($_POST['cat_id'] ?? 0) : ($json['cat_id'] ?? 0));
        $price = (float)($isPost ? ($_POST['price'] ?? 0) : ($json['price'] ?? 0));
        $stock = (int)($isPost ? ($_POST['stock'] ?? 0) : ($json['stock'] ?? 0));
        $threshold = (int)($isPost ? ($_POST['threshold'] ?? 10) : ($json['threshold'] ?? 10));
        $desc = trim($isPost ? ($_POST['desc'] ?? '') : ($json['desc'] ?? ''));

        if ($sku === '' || $name === '' || $cat_id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Please provide SKU, Product Name, and Category.']);
            exit;
        }

        $image_path = null;
        $hasFile = isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE;

        // Image is REQUIRED when adding a new product
        if ($id === 0 && !$hasFile) {
            echo json_encode(['success' => false, 'error' => 'Please upload a product image.']);
            exit;
        }

        if ($hasFile) {
            if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                echo json_encode(['success' => false, 'error' => 'Image upload error code: ' . $_FILES['image']['error']]);
                exit;
            }

            // Size limit: 2MB (2,097,152 bytes)
            if ($_FILES['image']['size'] > 2097152) {
                echo json_encode(['success' => false, 'error' => 'Image file size must be 2MB or less.']);
                exit;
            }

            // Real MIME type verification with finfo
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($_FILES['image']['tmp_name']);
            $allowedMimes = [
                'image/jpeg' => 'jpg',
                'image/png'  => 'png',
                'image/webp' => 'webp'
            ];

            if (!isset($allowedMimes[$mime])) {
                echo json_encode(['success' => false, 'error' => 'Invalid image format. Only JPG, PNG, and WEBP are allowed.']);
                exit;
            }

            $ext = $allowedMimes[$mime];
            $uploadDir = __DIR__ . '/../uploads/products/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
                // Secure upload folder: prevent script execution
                file_put_contents($uploadDir . '.htaccess', "# Disable script execution\n<FilesMatch \"\.(?i:php|phtml|php[0-9]|phps)$\">\nOrder Deny,Allow\nDeny from all\n</FilesMatch>\nphp_flag engine off\n");
            }

            $filename = 'prod_' . bin2hex(random_bytes(8)) . '_' . time() . '.' . $ext;
            $destination = $uploadDir . $filename;

            if (!move_uploaded_file($_FILES['image']['tmp_name'], $destination)) {
                echo json_encode(['success' => false, 'error' => 'Failed to save uploaded image file.']);
                exit;
            }

            $image_path = 'uploads/products/' . $filename;
        }

        try {
            if ($id > 0) {
                if ($image_path !== null) {
                    $stmt = $pdo->prepare("UPDATE products SET sku=?, name=?, category_id=?, price=?, stock=?, low_stock_threshold=?, description=?, image_path=? WHERE id=?");
                    $stmt->execute([$sku, $name, $cat_id, $price, $stock, $threshold, $desc, $image_path, $id]);
                } else {
                    $stmt = $pdo->prepare("UPDATE products SET sku=?, name=?, category_id=?, price=?, stock=?, low_stock_threshold=?, description=? WHERE id=?");
                    $stmt->execute([$sku, $name, $cat_id, $price, $stock, $threshold, $desc, $id]);
                }
            } else {
                $stmt = $pdo->prepare("INSERT INTO products (sku, name, category_id, price, stock, low_stock_threshold, description, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$sku, $name, $cat_id, $price, $stock, $threshold, $desc, $image_path]);
            }
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'toggle_product') {
        $pdo->prepare("UPDATE products SET is_active = NOT is_active WHERE id = ?")->execute([$_GET['id']]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'get_orders') {
        echo json_encode($pdo->query("SELECT * FROM orders ORDER BY created_at DESC")->fetchAll());
        exit;
    }

    if ($action === 'get_staff') {
        echo json_encode($pdo->query("SELECT id, username, email, phone, role, created_at FROM users WHERE role='staff' ORDER BY id DESC")->fetchAll());
        exit;
    }

    // 5 & 6. Add Staff with Phone, Email & Duplicate Email Validation
    if ($action === 'add_staff') {
        $data = getJsonInput();
        $username = trim($data['username'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $phone = trim($data['phone'] ?? '');
        $password = $data['password'] ?? '';

        if ($username === '' || $password === '') {
            echo json_encode(['success' => false, 'error' => 'Please provide both username and password.']);
            exit;
        }

        // Validate Email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
            echo json_encode(['success' => false, 'error' => 'Please enter a valid email address (example: name@gmail.com).']);
            exit;
        }

        // Validate Phone (10 digits starting with 6, 7, 8 or 9)
        if (!preg_match('/^[6-9][0-9]{9}$/', $phone)) {
            echo json_encode(['success' => false, 'error' => 'Phone number must be exactly 10 digits and start with 6, 7, 8 or 9.']);
            exit;
        }

        // Check duplicate email
        $chkEmail = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $chkEmail->execute([$email]);
        if ($chkEmail->fetch()) {
            echo json_encode(['success' => false, 'error' => 'This email is already registered']);
            exit;
        }

        // Check duplicate username
        $chkUser = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $chkUser->execute([$username]);
        if ($chkUser->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Username already exists.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO users (username, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'staff')");
            $stmt->execute([$username, $email, $phone, password_hash($password, PASSWORD_DEFAULT)]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Failed to add staff member: ' . $e->getMessage()]);
        }
        exit;
    }
}

// ==========================================
// STAFF ENDPOINTS
// ==========================================
if ($role === 'staff') {
    if ($action === 'staff_stats') {
        echo json_encode([
            'pending' => (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'Pending'")->fetchColumn(),
            'alerts' => $pdo->query("SELECT a.*, p.name as p_name, p.stock FROM alerts a JOIN products p ON a.product_id = p.id ORDER BY a.created_at DESC LIMIT 5")->fetchAll()
        ]);
        exit;
    }

    if ($action === 'get_active_products') {
        echo json_encode($pdo->query("SELECT p.*, c.name as cat_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.is_active=1 ORDER BY p.name ASC")->fetchAll());
        exit;
    }

    if ($action === 'get_orders') {
        echo json_encode($pdo->query("SELECT * FROM orders ORDER BY CASE WHEN status = 'Pending' THEN 1 WHEN status = 'Processing' THEN 2 WHEN status = 'Shipped' THEN 3 ELSE 4 END, created_at DESC")->fetchAll());
        exit;
    }

    if ($action === 'update_order') {
        $data = getJsonInput();
        $id = (int)($data['id'] ?? 0);
        $new_status = $data['status'] ?? '';
        
        $pdo->beginTransaction();
        $order = $pdo->prepare("SELECT status FROM orders WHERE id = ? FOR UPDATE");
        $order->execute([$id]);
        $order = $order->fetch();
        if ($order && $order['status'] !== $new_status) {
            $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?")->execute([$new_status, $id]);
            if ($new_status === 'Cancelled' && $order['status'] !== 'Cancelled') {
                $items = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
                $items->execute([$id]);
                foreach ($items->fetchAll() as $item) {
                    $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?")->execute([$item['quantity'], $item['product_id']]);
                    $pdo->prepare("INSERT INTO stock_logs (product_id, quantity_change, reason, user_id) VALUES (?, ?, 'cancel', ?)")
                        ->execute([$item['product_id'], $item['quantity'], $_SESSION['user_id']]);
                }
            }
        }
        $pdo->commit();
        echo json_encode(['success' => true]);
        exit;
    }
}

echo json_encode(['error' => 'Invalid action or permission denied.']);
exit;
?>