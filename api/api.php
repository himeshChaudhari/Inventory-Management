<?php
session_start();
require_once '../includes/db.php';
header('Content-Type: application/json');
$action = $_GET['action'] ?? '';
$role = $_SESSION['role'] ?? null;
function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}
// ==========================================
// ==========================================
if ($action === 'get_store_categories') {
    echo json_encode($pdo->query("SELECT * FROM categories ORDER BY name")->fetchAll()); exit;
}
if ($action === 'get_store_products') {
    $cat_id = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $query = "SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1";
    $params = [];
    if ($cat_id > 0) { $query .= " AND p.category_id = ?"; $params[] = $cat_id; }
    if ($search !== '') { $query .= " AND p.name LIKE ?"; $params[] = "%$search%"; }
    $query .= " ORDER BY p.name ASC";
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll()); exit;
}
if ($action === 'place_order') {
    $data = getJsonInput();
    if (!$data || empty($data['cart']) || empty($data['customer'])) {
        echo json_encode(['success' => false, 'error' => 'Invalid data']); exit;
    }
    $cust = $data['customer'];
    $cart = $data['cart'];
    $total_amount = 0;
    $pdo->beginTransaction();
    try {
        foreach ($cart as $item) {
            $stmt = $pdo->prepare("SELECT stock, price, name FROM products WHERE id = ? FOR UPDATE");
            $stmt->execute([$item['id']]);
            $product = $stmt->fetch();
            if (!$product || $product['stock'] < $item['quantity']) {
                throw new Exception("Sorry, '" . $product['name'] . "' only has " . $product['stock'] . " left.");
            }
            $total_amount += ($product['price'] * $item['quantity']);
        }
        $stmt = $pdo->prepare("INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, total_amount, status) VALUES (?, ?, ?, ?, ?, 'Pending')");
        $stmt->execute([$cust['name'], $cust['email'], $cust['phone'], $cust['address'], $total_amount]);
        $order_id = $pdo->lastInsertId();
        foreach ($cart as $item) {
            $p_stmt = $pdo->prepare("SELECT price, stock, low_stock_threshold FROM products WHERE id = ?");
            $p_stmt->execute([$item['id']]);
            $prod_data = $p_stmt->fetch();
            $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES (?, ?, ?, ?)")->execute([$order_id, $item['id'], $item['quantity'], $prod_data['price']]);
            $new_stock = $prod_data['stock'] - $item['quantity'];
            $pdo->prepare("UPDATE products SET stock = ? WHERE id = ?")->execute([$new_stock, $item['id']]);
            $pdo->prepare("INSERT INTO stock_logs (product_id, quantity_change, reason, user_id) VALUES (?, ?, 'order', NULL)")->execute([$item['id'], -$item['quantity']]);
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
// ==========================================
if ($action === 'login') {
    $data = getJsonInput();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([trim($data['username'])]);
    $user = $stmt->fetch();
    if ($user && password_verify($data['password'], $user['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        echo json_encode(['success' => true, 'role' => $user['role']]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
    }
    exit;
}
if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]); exit;
}
if ($action === 'check_session') {
    echo json_encode(['logged_in' => (bool)$role, 'role' => $role, 'username' => $_SESSION['username'] ?? '']); exit;
}
if (!$role) {
    echo json_encode(['error' => 'Unauthorized']); exit;
}
// ==========================================
// ==========================================
if ($role === 'admin') {
    if ($action === 'get_analytics') {
        $revenue = $pdo->query("SELECT SUM(total_amount) FROM orders WHERE status != 'Cancelled'")->fetchColumn();
        $trend = $pdo->query("SELECT DATE(created_at) as date, SUM(total_amount) as total FROM orders WHERE status != 'Cancelled' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date ASC")->fetchAll();
        $best = $pdo->query("SELECT p.name, SUM(oi.quantity) as sold FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN orders o ON oi.order_id = o.id WHERE o.status != 'Cancelled' GROUP BY p.id ORDER BY sold DESC LIMIT 5")->fetchAll();
        $dead = $pdo->query("SELECT p.name, p.stock FROM products p WHERE p.is_active = 1 AND p.id NOT IN (SELECT oi.product_id FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))")->fetchAll();
        echo json_encode(['revenue' => $revenue ?: 0, 'trend' => $trend, 'best' => $best, 'dead' => $dead]); exit;
    }
    if ($action === 'get_reorder') {
        $data = $pdo->query("SELECT p.id, p.name, p.stock, COALESCE(SUM(oi.quantity), 0) as total_sold_30d FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND o.status != 'Cancelled' WHERE p.is_active = 1 GROUP BY p.id")->fetchAll();
        $suggestions = [];
        foreach ($data as $row) {
            $avg_daily = $row['total_sold_30d'] / 30;
            $lead_time = 7; $safety_stock = 5;
            $reorder_point = ($avg_daily * $lead_time) + $safety_stock;
            if ($row['stock'] <= $reorder_point) {
                $suggestions[] = [
                    'name' => $row['name'], 'stock' => $row['stock'],
                    'avg_daily' => round($avg_daily, 2), 'reorder_point' => ceil($reorder_point),
                    'suggested_qty' => ceil($reorder_point) - $row['stock']
                ];
            }
        }
        echo json_encode($suggestions); exit;
    }
    if ($action === 'admin_stats') {
        echo json_encode([
            'products' => $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn(),
            'orders' => $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn(),
            'staff' => $pdo->query("SELECT COUNT(*) FROM users WHERE role='staff'")->fetchColumn()
        ]); exit;
    }
    if ($action === 'add_category') {
        $data = getJsonInput();
        try { echo json_encode(['success' => $pdo->prepare("INSERT INTO categories (name, description) VALUES (?, ?)")->execute([$data['name'], $data['desc']])]); } 
        catch (Exception $e) { echo json_encode(['success' => false, 'error' => 'Category exists']); } exit;
    }
    if ($action === 'get_categories') {
        echo json_encode($pdo->query("SELECT * FROM categories")->fetchAll()); exit;
    }
    if ($action === 'get_products') {
        echo json_encode($pdo->query("SELECT p.*, c.name as cat_name FROM products p JOIN categories c ON p.category_id = c.id ORDER BY p.id DESC")->fetchAll()); exit;
    }
    if ($action === 'save_product') {
        $data = getJsonInput();
        if ($data['id'] > 0) {
            $pdo->prepare("UPDATE products SET sku=?, name=?, category_id=?, price=?, stock=?, low_stock_threshold=?, description=? WHERE id=?")->execute([$data['sku'], $data['name'], $data['cat_id'], $data['price'], $data['stock'], $data['threshold'], $data['desc'], $data['id']]);
        } else {
            $pdo->prepare("INSERT INTO products (sku, name, category_id, price, stock, low_stock_threshold, description) VALUES (?, ?, ?, ?, ?, ?, ?)")->execute([$data['sku'], $data['name'], $data['cat_id'], $data['price'], $data['stock'], $data['threshold'], $data['desc']]);
        }
        echo json_encode(['success' => true]); exit;
    }
    if ($action === 'toggle_product') {
        $pdo->prepare("UPDATE products SET is_active = NOT is_active WHERE id = ?")->execute([$_GET['id']]);
        echo json_encode(['success' => true]); exit;
    }
    if ($action === 'get_orders') {
        echo json_encode($pdo->query("SELECT * FROM orders ORDER BY created_at DESC")->fetchAll()); exit;
    }
    if ($action === 'get_staff') {
        echo json_encode($pdo->query("SELECT id, username, created_at FROM users WHERE role='staff'")->fetchAll()); exit;
    }
    if ($action === 'add_staff') {
        $data = getJsonInput();
        try {
            $pdo->prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'staff')")->execute([$data['username'], password_hash($data['password'], PASSWORD_DEFAULT)]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) { echo json_encode(['success' => false, 'error' => 'Username exists']); } exit;
    }
}
// ==========================================
// ==========================================
if ($role === 'staff') {
    if ($action === 'staff_stats') {
        echo json_encode([
            'pending' => $pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'Pending'")->fetchColumn(),
            'alerts' => $pdo->query("SELECT a.*, p.name as p_name, p.stock FROM alerts a JOIN products p ON a.product_id = p.id ORDER BY a.created_at DESC LIMIT 5")->fetchAll()
        ]); exit;
    }
    if ($action === 'get_active_products') {
        echo json_encode($pdo->query("SELECT p.*, c.name as cat_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.is_active=1 ORDER BY p.name ASC")->fetchAll()); exit;
    }
    if ($action === 'get_orders') {
        echo json_encode($pdo->query("SELECT * FROM orders ORDER BY CASE WHEN status = 'Pending' THEN 1 WHEN status = 'Processing' THEN 2 WHEN status = 'Shipped' THEN 3 ELSE 4 END, created_at DESC")->fetchAll()); exit;
    }
    if ($action === 'update_order') {
        $data = getJsonInput();
        $id = $data['id']; $new_status = $data['status'];
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
                    $pdo->prepare("INSERT INTO stock_logs (product_id, quantity_change, reason, user_id) VALUES (?, ?, 'cancel', ?)")->execute([$item['product_id'], $item['quantity'], $_SESSION['user_id']]);
                }
            }
        }
        $pdo->commit();
        echo json_encode(['success' => true]); exit;
    }
}
echo json_encode(['error' => 'Invalid action or permission denied']);
?>
