// js/store.js - Storefront Logic
let currentCategory = 0;
let cart = [];

// Fallback SKU image mapping for standard sample products
const defaultSkuImages = {
    'ELC-001': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80', // Mouse
    'ELC-002': 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=400&q=80', // Keyboard
    'ELC-003': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80', // Monitor
    'ELC-004': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80', // Hub
    'ELC-005': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=400&q=80', // Speaker
    'OFS-001': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80', // Paper
    'OFS-002': 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?auto=format&fit=crop&w=400&q=80', // Pens
    'OFS-003': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80', // Stapler
    'OFS-004': 'https://images.unsplash.com/photo-1580569214296-5cb22ff2e9cc?auto=format&fit=crop&w=400&q=80', // Markers
    'OFS-005': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80', // Sticky Notes
    'FUR-001': 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=400&q=80', // Chair
    'FUR-002': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=400&q=80', // Desk
    'FUR-003': 'https://images.unsplash.com/photo-1594620302200-9a762244a156?auto=format&fit=crop&w=400&q=80', // Bookshelf
    'APP-001': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=400&q=80', // Hoodie
    'APP-002': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=400&q=80', // Cap
    'APP-003': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80', // Backpack
    'BKS-001': 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80', // Text
    'BKS-002': 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80', // Code
    'BKS-003': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80', // Code
    'BKS-004': 'https://images.unsplash.com/photo-1589998059171-9899ea626244?auto=format&fit=crop&w=400&q=80'  // Patterns
};

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
    initNavbarScrollSpy();
    initFaqAccordion();
    setupCheckoutValidation();
});

// Resolves proper image URL or null for neutral placeholder
function resolveProductImage(p) {
    if (p.image_path && p.image_path.trim() !== '') {
        return p.image_path;
    }
    if (p.sku && defaultSkuImages[p.sku]) {
        return defaultSkuImages[p.sku];
    }
    return null;
}

// 1. Navigation smooth scrolling and active link highlighting (IntersectionObserver)
function initNavbarScrollSpy() {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    
    // Smooth scroll handler on click
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: 'smooth' });
                history.pushState(null, null, targetId);
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    // IntersectionObserver to highlight section while scrolling
    const sections = document.querySelectorAll('#shop, #how, #faq');
    if ('IntersectionObserver' in window && sections.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        } else {
                            link.classList.remove('active');
                        }
                    });
                }
            });
        }, {
            root: null,
            rootMargin: '-20% 0px -55% 0px',
            threshold: 0.1
        });

        sections.forEach(sec => observer.observe(sec));
    }
}

// 2. FAQ Accordion animation (One open at a time)
function initFaqAccordion() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Close all open items
            items.forEach(other => {
                other.classList.remove('open');
                const body = other.querySelector('.faq-body');
                if (body) {
                    body.style.maxHeight = '0px';
                }
            });

            // Toggle clicked item
            if (!isOpen) {
                item.classList.add('open');
                const body = item.querySelector('.faq-body');
                if (body) {
                    body.style.maxHeight = body.scrollHeight + 20 + 'px';
                }
            }
        });
    });
}

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
    loadCategories();
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

                const productImg = resolveProductImage(p);
                const initialLetter = (p.name || 'P').charAt(0).toUpperCase();
                
                // Safe image container: onerror NEVER wipes out the product card content!
                let imgMarkup = '';
                if (productImg) {
                    imgMarkup = `
                        <div class="product-img-box" style="width: 100%; height: 180px; border-radius: var(--radius-sm); margin-bottom: 16px; overflow: hidden; background: linear-gradient(135deg, #F5EAE1, #E8D5C4); border: 1px solid var(--card-border); position: relative;">
                            <img src="${productImg}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
                            <div class="product-img-placeholder" style="width: 100%; height: 100%; display: none; margin-bottom: 0; border: none; position: absolute; inset: 0;">${initialLetter}</div>
                        </div>
                    `;
                } else {
                    imgMarkup = `
                        <div class="product-img-box" style="width: 100%; height: 180px; border-radius: var(--radius-sm); margin-bottom: 16px; overflow: hidden;">
                            <div class="product-img-placeholder" style="width: 100%; height: 100%; margin-bottom: 0;">${initialLetter}</div>
                        </div>
                    `;
                }

                // Preserve image reference on product payload for cart drawer thumbnail
                p.displayImage = productImg;
                const productJson = encodeURIComponent(JSON.stringify(p));
                
                html += `
                    <div class="card product-card" style="padding: 24px;">
                        ${imgMarkup}
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <small style="color:var(--text-muted); font-weight:600; text-transform:uppercase; font-size:12px;">${p.category_name || 'General'}</small>
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
            max_stock: p.stock,
            image: p.displayImage || resolveProductImage(p)
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
            
            let thumb = '';
            if (item.image) {
                thumb = `<img src="${item.image}" alt="${item.name}" style="width:48px; height:48px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--card-border); flex-shrink:0;">`;
            } else {
                thumb = `<div class="product-img-placeholder" style="width:48px; height:48px; font-size:16px; margin-bottom:0; flex-shrink:0;">${item.name.charAt(0)}</div>`;
            }

            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 14px 0; border-bottom: 1px solid var(--card-border); gap: 12px;">
                    <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
                        ${thumb}
                        <div style="min-width:0;">
                            <div style="font-weight:700; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
                            <div style="font-size:13px; color:var(--text-muted);">${formatINR(item.price)} &times; ${item.quantity}</div>
                        </div>
                    </div>
                    <div style="text-align:right; flex-shrink:0;">
                        <div style="font-weight:800; color:var(--text-main); font-size:14px;">${formatINR(lineTotal)}</div>
                        <button onclick="removeFromCart(${item.id})" style="background:none; color:var(--danger); font-size:11px; font-weight:700; margin-top:2px;">REMOVE</button>
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

// 5 & 6. Checkout Validation Setup
function setupCheckoutValidation() {
    const emailInput = document.getElementById('cust-email');
    const emailError = document.getElementById('cust-email-error');
    const phoneInput = document.getElementById('cust-phone');
    const phoneError = document.getElementById('cust-phone-error');

    if (emailInput && emailError) {
        attachEmailValidator(emailInput, emailError);
    }
    if (phoneInput && phoneError) {
        attachPhoneValidator(phoneInput, phoneError);
    }
}

async function submitOrder(e) {
    e.preventDefault();
    if (cart.length === 0) return showToast("Cart is empty", 'error');
    
    const nameInput = document.getElementById('cust-name');
    const emailInput = document.getElementById('cust-email');
    const phoneInput = document.getElementById('cust-phone');
    const addrInput = document.getElementById('cust-address');

    const emailError = document.getElementById('cust-email-error');
    const phoneError = document.getElementById('cust-phone-error');

    // Run client validations
    const emailCheck = validateEmail(emailInput.value);
    if (!emailCheck.valid) {
        setFieldError(emailInput, emailError, emailCheck.error);
        emailInput.focus();
        return;
    } else {
        setFieldSuccess(emailInput, emailError);
    }

    const phoneCheck = validatePhoneNumber(phoneInput.value);
    if (!phoneCheck.valid) {
        setFieldError(phoneInput, phoneError, phoneCheck.error);
        phoneInput.focus();
        return;
    } else {
        setFieldSuccess(phoneInput, phoneError);
    }

    const btn = document.getElementById('checkout-submit-btn') || e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Processing...';
    btn.disabled = true;

    const payload = {
        customer: {
            name: nameInput.value.trim(),
            email: emailCheck.clean,
            phone: phoneCheck.clean,
            address: addrInput.value.trim()
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
            setFieldNeutral(emailInput, emailError);
            setFieldNeutral(phoneInput, phoneError);
            
            // Show success screen
            document.getElementById('products-grid').innerHTML = `
                <div class="card" style="grid-column: 1/-1; text-align:center; padding: 60px;">
                    <div style="width:64px; height:64px; background:var(--accent-light); color:var(--accent); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:800; margin:0 auto 20px auto;">✓</div>
                    <h2>Order Placed Successfully!</h2>
                    <p style="margin: 16px auto;">Your order ID is <strong>#${result.order_id}</strong>. We've received your request and will process it shortly.</p>
                    <button class="btn-primary" onclick="loadProducts()">Continue Shopping</button>
                </div>
            `;
            window.location.hash = '#shop';
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
