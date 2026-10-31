// js/app.js - Global utilities and API wrappers

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    if(type === 'error') toast.style.borderLeftColor = 'var(--danger)';
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

function formatINR(number) {
    const val = Number(number) || 0;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
}

async function apiCall(action, payload = null) {
    const options = { method: payload ? 'POST' : 'GET' };
    if (payload) {
        if (payload instanceof FormData) {
            // Note: Do NOT set Content-Type header manually for FormData.
            // The browser will automatically set 'multipart/form-data; boundary=...'
            options.body = payload;
        } else {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(payload);
        }
    }
    const prefix = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/staff/') ? '../' : '';
    
    try {
        const response = await fetch(`${prefix}api/api.php?action=${action}`, options);
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (jsonErr) {
            console.error("Non-JSON Server Output:", text);
            const cleanText = text.replace(/<[^>]*>/g, '').trim();
            return { success: false, error: cleanText.slice(0, 200) || 'Server returned an invalid response.' };
        }
    } catch (e) {
        console.error("Network Error:", e);
        return { success: false, error: 'Network error occurred. Please check that WAMP Server is running.' };
    }
}

async function enforceRole(requiredRole) {
    const res = await apiCall('check_session');
    if (!res.logged_in || res.role !== requiredRole) {
        const prefix = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/staff/') ? '../' : '';
        window.location.href = prefix + 'login.html';
    } else {
        const userDisplay = document.getElementById('username-display');
        if (userDisplay) userDisplay.innerText = res.username;
    }
}

async function logout() {
    await apiCall('logout');
    const prefix = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/staff/') ? '../' : '';
    window.location.href = prefix + 'login.html';
}

function showView(viewId) {
    const views = document.querySelectorAll('.view-section');
    views.forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
    });
    
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(l => l.classList.remove('active'));
    
    const activeView = document.getElementById(viewId);
    if(activeView) activeView.style.display = 'block';
    
    // Highlight sidebar item matching the viewId
    const actionKey = viewId.replace('view-', '');
    const activeLink = document.querySelector(`.sidebar-link[onclick*="${actionKey}"]`);
    if(activeLink) activeLink.classList.add('active');
}
