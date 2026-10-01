// js/store.js - Storefront Logic
let currentCategory = 0;
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
});

async function loadCategories() {
    try {
        const categories = await apiCall('get_store_categories');
        let html = `<button class="btn-secondary ${currentCategory === 0 ? 'active' : ''}" style="border-radius: 30px;" onclick="filterCategory(0)">All Products</button>`;
        categories.forEach(c => {
            html += `<button class="btn-secondary ${currentCategory === c.id ? 'active' : ''}" style="border-radius: 30px;" onclick="filterCategory(${c.id})">${c.name}</button>`;
        });
        document.getElementById('category-list').innerHTML = html;
    } catch (error) {
        console.error("Error loading categories", error);
    }
}

function filterCategory(id) {
    currentCategory = id;
    loadCategories(); // refresh active state
    loadProducts();
}

async function loadProducts() {
    const searchBox = document.getElementById('search-box');
    const search = searchBox ? searchBox.value : '';
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Loading products...</div>';
    
    try {
        let products = await apiCall(`get_store_products&category_id=${currentCategory}&search=${encodeURIComponent(search)}`);
        
        const sortVal = document.getElementById('sort-dropdown') ? document.getElementById('sort-dropdown').value : '';
        if (sortVal === 'price_asc') products.sort((a,b) => parseFloat(a.price) - parseFloat(b.price));
        if (sortVal === 'price_desc') products.sort((a,b) => parseFloat(b.price) - parseFloat(a.price));

        let html = '';
        if(products.length === 0) {
            html = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">No products found. Try adjusting your search.</div>';
        } else {
            products.forEach(p => {
                let badge = '';
                let btnState = '';
                let btnText = 'Add to cart <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
                
                if (p.stock <= 0) {
                    badge = `<span class="badge badge-danger">Out of stock</span>`;
                    btnState = 'disabled';
                    btnText = 'Out of Stock';
                } else if (p.stock <= p.low_stock_threshold) {
                    badge = `<span class="badge badge-warning">Only ${p.stock} left</span>`;
                } else {
                    badge = `<span class="badge badge-success">In stock</span>`;
                }

                const productJson = encodeURIComponent(JSON.stringify(p));
                
                // Map specific SKUs to real, highly-relevant images
                const imgUrls = {
                    'ELC-001': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80', // Mouse
                    'ELC-002': 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&q=80', // Keyboard
                    'ELC-003': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&q=80', // Monitor
                    'ELC-004': 'https://images.unsplash.com/photo-1572688755609-b4be96fbc625?w=400&q=80', // Hub
                    'ELC-005': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80', // Speaker
                    'OFS-001': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&q=80', // Paper
                    'OFS-002': 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400&q=80', // Pens
                    'OFS-003': 'https://images.unsplash.com/photo-1558231221-a537f8f948ba?w=400&q=80', // Stapler
                    'OFS-004': 'https://images.unsplash.com/photo-1580569214296-5cb22ff2e9cc?w=400&q=80', // Markers
                    'OFS-005': 'https://images.unsplash.com/photo-1533038590840-1cbea6e866eb?w=400&q=80', // Sticky Notes
                    'FUR-001': 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=400&q=80', // Chair
                    'FUR-002': 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400&q=80', // Desk
                    'FUR-003': 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&q=80', // Bookshelf
                    'APP-001': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80', // Hoodie
                    'APP-002': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80', // Cap
                    'APP-003': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80', // Backpack
                    'BKS-001': 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80', // Text
                    'BKS-002': 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', // Code
                    'BKS-003': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80', // Code
                    'BKS-004': 'https://images.unsplash.com/photo-1589998059171-9899ea626244?w=400&q=80'  // Patterns
                };
                // Fallback image if a new product is added by the admin
                const fallbackImg = 'https://images.unsplash.com/photo-1572916281084-59e51c86e09f?w=400&q=80';
                const imgUrl = imgUrls[p.sku] || fallbackImg;
                
                html += `
                    <div class="card product-card" style="padding: 24px;">
                        <img src="${imgUrl}" alt="${p.name}" style="width: 100%; height: 180px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: 16px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <small style="color:var(--text-muted); font-weight:600; text-transform:uppercase; font-size:12px;">${p.category_name}</small>
                                <h3 style="font-size:18px; margin-top:4px;">${p.name}</h3>
                            </div>
                            ${badge}
                        </div>
                        <p style="font-size:14px; margin-top:8px; flex:1;">${p.description || ''}</p>
                        <div class="product-price">${formatINR(p.price)}</div>
                        <button class="btn-primary" ${btnState} onclick="addToCart('${productJson}')" style="width:100%; justify-content:center;">${btnText}</button>
                    </div>
                `;
            });
        }
        grid.innerHTML = html;
    } catch (error) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--danger);">Error loading products.</div>';
    }
}

function addToCart(productJsonEncoded) {
    const p = JSON.parse(decodeURIComponent(productJsonEncoded));
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
        if (existing.quantity < p.stock) {
            existing.quantity++;
            showToast(`Added another ${p.name} to cart.`);
        } else {
            showToast(`Sorry, only ${p.stock} units available in stock.`, 'error');
        }
    } else {
        cart.push({
            id: p.id,
            name: p.name,
            price: parseFloat(p.price),
            quantity: 1,
            max_stock: p.stock
        });
        showToast(`${p.name} added to cart!`);
    }
    updateCartUI();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if(badge) badge.innerText = totalItems;
    
    let html = '';
    let totalAmount = 0;
    
    if (cart.length === 0) {
        html = '<div style="text-align:center; padding: 40px; color:var(--text-muted);">Your cart is empty.</div>';
        document.getElementById('show-checkout-btn').style.display = 'none';
        document.getElementById('checkout-form').style.display = 'none';
    } else {
        document.getElementById('show-checkout-btn').style.display = 'block';
        cart.forEach(item => {
            const lineTotal = item.price * item.quantity;
            totalAmount += lineTotal;
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 16px 0; border-bottom: 1px solid var(--card-border);">
                    <div>
                        <div style="font-weight:700;">${item.name}</div>
                        <div style="font-size:14px; color:var(--text-muted);">${formatINR(item.price)} &times; ${item.quantity}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800; color:var(--text-main);">${formatINR(lineTotal)}</div>
                        <button onclick="removeFromCart(${item.id})" style="background:none; color:var(--danger); font-size:12px; font-weight:700; margin-top:4px;">REMOVE</button>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('cart-items').innerHTML = html;
    document.getElementById('cart-total').innerText = formatINR(totalAmount);
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    const overlay = document.getElementById('cart-overlay');
    if (modal.classList.contains('open')) {
        modal.classList.remove('open');
        overlay.classList.remove('open');
    } else {
        modal.classList.add('open');
        overlay.classList.add('open');
    }
}

function showCheckoutForm() {
    document.getElementById('show-checkout-btn').style.display = 'none';
    document.getElementById('checkout-form').style.display = 'flex';
}

async function submitOrder(e) {
    e.preventDefault();
    if (cart.length === 0) return showToast("Cart is empty", 'error');
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Processing...';
    btn.disabled = true;

    const payload = {
        customer: {
            name: document.getElementById('cust-name').value,
            email: document.getElementById('cust-email').value,
            phone: document.getElementById('cust-phone').value,
            address: document.getElementById('cust-address').value
        },
        cart: cart.map(item => ({ id: item.id, quantity: item.quantity }))
    };
    
    try {
        const result = await apiCall('place_order', payload);
        if (result.success) {
            cart = [];
            updateCartUI();
            toggleCart();
            loadProducts();
            document.getElementById('checkout-form').reset();
            document.getElementById('checkout-form').style.display = 'none';
            
            // Show success screen
            document.getElementById('products-grid').innerHTML = `
                <div class="card" style="grid-column: 1/-1; text-align:center; padding: 60px;">
                    <h1 style="color:var(--success); font-size:48px; margin-bottom:16px;">?</h1>
                    <h2>Order Placed Successfully!</h2>
                    <p style="margin: 16px auto;">Your order ID is <strong>#${result.order_id}</strong>. We've received your request and will process it shortly.</p>
                    <button class="btn-primary" onclick="loadProducts()">Continue Shopping</button>
                </div>
            `;
        } else {
            showToast(`Checkout failed: ${result.error}`, 'error');
            loadProducts(); 
        }
    } catch (error) {
        showToast("An error occurred during checkout.", 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
