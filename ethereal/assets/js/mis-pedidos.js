/**
 * assets/js/mis-pedidos.js
 * Passwordless Orders – versión estable (HOTFIX FASE 4)
 */
const CUSTOMER_TOKEN_KEY = 'ethereal_customer_token';
async function startSession(magicToken) {
    const res = await fetch(`${API_BASE}/api/session/start?token=${magicToken}`);
    if (!res.ok) return initLoginView();

    const data = await res.json();
    localStorage.setItem(CUSTOMER_TOKEN_KEY, data.token);
    window.history.replaceState({}, document.title, 'mis-pedidos.html');
    initCustomerOrders(data.token);
    
}

async function initCustomerOrders(token) {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('orders-view').style.display = 'block';

    const list = document.getElementById('orders-list');
    list.innerHTML = '<p>Cargando pedidos...</p>';

    const res = await fetch(`${API_BASE}/api/customer/orders`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        localStorage.removeItem(CUSTOMER_TOKEN_KEY);
        return initLoginView();
    }

    const orders = await res.json();

    if (!orders.length) {
        list.innerHTML = '';
        document.getElementById('empty-state').style.display = 'block';
        return;
    }

    renderOrders(orders);
}



const API_BASE = "https://api.ethere4l.com";


document.addEventListener('DOMContentLoaded', () => {
    function generateLegacyToken(orderId) {
        return null;
    }

    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const customerToken = localStorage.getItem(CUSTOMER_TOKEN_KEY);

    if (customerToken) {
        initCustomerOrders(customerToken);
        return;
    }

    if (tokenFromUrl) {
        startSession(tokenFromUrl);
        return;
    }

    initLoginView();
});

// =====================
// LOGIN VIEW
// =====================
function initLoginView() {
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('orders-view').style.display = 'none';

    const form = document.getElementById('magic-form');
    const btn = document.getElementById('btn-send');
    const loader = document.getElementById('loader');
    const msg = document.getElementById('msg-success');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value.trim();

        btn.disabled = true;
        loader.style.display = 'block';
        msg.style.display = 'none';

        try {
            gtag?.('event', 'magic_link_requested');

            const res = await fetch(`${API_BASE}/api/magic-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                msg.style.display = 'block';
            }


            loader.style.display = 'none';
            msg.style.display = 'block';
            btn.disabled = false;
            form.reset();

        } catch {
            loader.style.display = 'none';
            btn.disabled = false;
            alert('Error de conexión. Intenta más tarde.');
        }
    });
}

// =====================
// ORDERS VIEW
// =====================
async function initOrdersView(token) {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('orders-view').style.display = 'block';

    const list = document.getElementById('orders-list');
    list.innerHTML = '<p>Cargando pedidos...</p>';

    try {
        gtag?.('event', 'magic_link_opened');

        const res = await fetch(`${API_BASE}/api/my-orders`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('expired');

        // FIX: Variable 'res' usada correctamente
        const data = await res.json();

        if (!data.orders || data.orders.length === 0) {
            list.innerHTML = '<p>No tienes pedidos registrados.</p>';
            return;
        }

        renderOrders(data.orders);
        gtag?.('event', 'my_orders_viewed', { count: data.orders.length });

    } catch (e) {
        console.error(e);
        sessionStorage.removeItem('magic_token');
        document.getElementById('orders-view').innerHTML = `
            <div style="text-align:center;padding:40px">
                <h3>🔒 Acceso expirado</h3>
                <p>Por seguridad, solicita un nuevo enlace.</p>
                <a href="mis-pedidos.html" class="btn-black">Solicitar enlace</a>
            </div>
        `;
    }
}

function renderOrders(orders) {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('orders-view').style.display = 'block';

    const list = document.getElementById('orders-list');
    list.innerHTML = '';

    if (!orders.length) {
        document.getElementById('empty-state').style.display = 'block';
        return;
    }

    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('es-MX');
        const total = order.total.toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });

        const firstItem = order.items[0] || {};
        const img = firstItem.imagen || 'assets/img/logo-ethereal.png';
        const imgAlt = firstItem.nombre || 'Pedido ETHEREAL';

        list.innerHTML += `
            <div class="order-card">
                <img 
                    src="${img}" 
                    class="thumb-img" 
                    alt="${imgAlt}" 
                    width="600" 
                    height="800" 
                    loading="lazy" 
                    decoding="async" 
                    onerror="this.src='assets/img/logo-ethereal.png'">
                <div class="order-info">
                    <h3>Pedido #${order.id.slice(0, 8)}</h3>
                    <div class="order-meta">${date}</div>
                    <span class="order-status status-${order.status.toLowerCase()}">
                        ${order.status}
                    </span>
                </div>
                <div>
                    <strong>${total}</strong><br>
                    <a class="btn-view"
                    href="pedido-ver.html?id=${order.id}&token=${order.order_token}">
                    Ver pedido
                    </a>

                </div>
            </div>
        `;
    });
}



window.logout = () => {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    sessionStorage.removeItem('magic_token');
    window.location.href = 'mis-pedidos.html';
};