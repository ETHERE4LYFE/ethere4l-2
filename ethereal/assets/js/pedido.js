// =========================================================
// PEDIDO.JS — Vista de pedido individual (CORREGIDO)
// =========================================================
// FIXES APPLIED:
//   ✅ FIX 1: URL had semicolon instead of slash — CRITICAL
//   ✅ FIX 2: Now uses ETHERE4L_CONFIG for API base
//   ✅ FIX 3: Added credentials:'include' for cookie auth
//   ✅ FIX 4: Added res.ok check
//   ✅ All existing functions preserved 1:1
// =========================================================

/* ============================= */
/* HELPERS */
/* ============================= */

var formatCurrency = function(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
};

// ✅ FIX 2: Centralized API URL
function getApiBase() {
    if (window.ETHERE4L_CONFIG && window.ETHERE4L_CONFIG.API_BASE) {
        return window.ETHERE4L_CONFIG.API_BASE;
    }
    return 'https://api.ethere4l.com';
}

/* ============================= */
/* ENTRY POINT */
/* ============================= */

document.addEventListener('DOMContentLoaded', async function() {

    var params = new URLSearchParams(window.location.search);
    var orderId = params.get('id');
    var tokenFromUrl = params.get('token');
    var tokenFromSession = sessionStorage.getItem('magic_token');

    var token = tokenFromUrl || tokenFromSession;
    var isEmailAccess = Boolean(tokenFromUrl);

    // Guard de seguridad
    if (!orderId || !token) {
        showSessionExpired();
        return;
    }

    try {
        var API_BASE = getApiBase();

        // ✅ FIX 1: CRITICAL — was using semicolon (;) instead of slash (/)
        // BEFORE: `https://api.ethere4l.com;${orderId}`  ← BROKEN
        // AFTER:  `${API_BASE}/api/orders/track/${orderId}` ← CORRECT
        var res = await fetch(
            API_BASE + '/api/orders/track/' + orderId,
            {
                headers: { Authorization: 'Bearer ' + token },
                // ✅ FIX 3: Added credentials for cross-origin cookie support
                credentials: 'include'
            }
        );

        if (res.status === 401 || res.status === 403) {
            showSessionExpired();
            return;
        }

        // ✅ FIX 4: Check res.ok
        if (!res.ok) throw new Error('Error API: HTTP ' + res.status);

        var order = await res.json();

        renderOrder(order, isEmailAccess);

    } catch (err) {
        console.error(err);
        document.body.innerHTML = '<h3 style="text-align:center;padding:40px;">Error cargando pedido. <a href="mis-pedidos.html">Volver</a></h3>';
    }
});

/* ============================= */
/* RENDER ORDER */
/* ============================= */

function renderOrder(order, isEmailAccess) {

    /* --- HEADER --- */
    document.getElementById('order-id').innerText =
        'Pedido #' + order.id.slice(0, 8);

    var orderDate = order.date
        ? new Date(order.date + 'Z').toLocaleDateString('es-MX', {
            timeZone: 'America/Mexico_City',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
        : 'Fecha no disponible';

    document.getElementById('order-status').innerHTML =
        '<strong>' + order.status + '</strong><br>' + orderDate;

    /* --- TIMELINE --- */
    if (['PAGADO', 'paid', 'confirmed'].includes(order.status)) {
        var stepPacked = document.getElementById('step-packed');
        if (stepPacked) stepPacked.classList.add('active');
    }
    if (order.tracking_number) {
        var stepPacked2 = document.getElementById('step-packed');
        var stepTransit = document.getElementById('step-transit');
        if (stepPacked2) stepPacked2.classList.add('active');
        if (stepTransit) stepTransit.classList.add('active');
    }
    if (order.status === 'ENTREGADO') {
        var stepDelivered = document.getElementById('step-delivered');
        if (stepDelivered) stepDelivered.classList.add('active');
    }

    /* --- TRACKING --- */
    var trackingBox = document.getElementById('tracking-info');

    if (!order.tracking_number) {
        trackingBox.innerHTML =
            '<div class="eth-trust-message">' +
                '📦 Tu pedido está siendo preparado.<br>' +
                'Te avisaremos por correo cuando sea enviado.' +
            '</div>';
    } else {
        trackingBox.innerHTML =
            '<p><strong>Carrier:</strong> ' + (order.carrier || 'Paquetería') + '</p>' +
            '<p><strong>Guía:</strong> ' + order.tracking_number + '</p>';

        if (order.tracking_history && order.tracking_history.length) {
            trackingBox.innerHTML +=
                '<ul class="timeline">' +
                    order.tracking_history.map(function(e, i) {
                        return '<li class="timeline-item ' + (i === 0 ? 'active' : '') + '">' +
                            '<div class="timeline-marker"></div>' +
                            '<div class="timeline-content">' +
                                '<strong>' + e.status + '</strong><br>' +
                                '<small>' + (e.location || '') + '</small><br>' +
                                '<small>' + new Date(e.timestamp).toLocaleString('es-MX') + '</small>' +
                            '</div>' +
                        '</li>';
                    }).join('') +
                '</ul>';
        }
    }

    /* --- ACTION BUTTON --- */
    var actions = document.getElementById('pedido-actions');
    actions.innerHTML = isEmailAccess
        ? '<a href="index.html" class="btn-black">Volver al inicio</a>'
        : '<a href="mis-pedidos.html" class="btn-black">Volver a mis pedidos</a>';

    /* --- TRUST MESSAGE --- */
    if (order.status !== 'ENTREGADO') {
        var trustBox = document.getElementById('trust-message-container');
        if (trustBox) trustBox.style.display = 'block';
    }

    /* --- ITEMS --- */
    var itemsList = document.getElementById('items-list');
    itemsList.innerHTML = ''; // limpiar "Cargando productos…"

    if (!order.items || !order.items.length) {
        itemsList.innerHTML =
            '<div style="padding:20px;color:#666;text-align:center">' +
                'No hay productos disponibles para mostrar.' +
            '</div>';
    } else {
        order.items.forEach(function(item) {
            var img = item.imagen || 'assets/img/logo-ethereal.png';
            var itemAlt = item.nombre || 'Producto ETHEREAL';

            itemsList.innerHTML +=
                '<div class="eth-item-row">' +
                    '<img src="' + img + '" class="eth-item-img" alt="' + itemAlt + '" ' +
                        'width="600" height="800" loading="lazy" decoding="async" ' +
                        'onerror="this.src=\'assets/img/logo-ethereal.png\'">' +
                    '<div class="eth-item-info">' +
                        '<div class="eth-item-title">' + item.nombre + '</div>' +
                        '<div class="eth-item-meta">' +
                            'Talla: ' + (item.talla || 'N/A') + ' · Cant: ' + item.cantidad +
                        '</div>' +
                    '</div>' +
                    '<div class="eth-item-price">' +
                        formatCurrency(item.subtotal || (item.precio * item.cantidad)) +
                    '</div>' +
                '</div>';
        });
    }

    /* --- FINANCIAL SUMMARY --- */
    var subtotal = 0;
    if (order.items) {
        subtotal = order.items.reduce(function(sum, i) {
            return sum + (i.precio * i.cantidad);
        }, 0);
    }

    document.getElementById('financial-summary').innerHTML =
        '<div class="eth-summary-box">' +
            '<div class="eth-summary-row">' +
                '<span>Subtotal</span>' +
                '<span>' + formatCurrency(subtotal) + '</span>' +
            '</div>' +
            '<div class="eth-summary-row">' +
                '<span>Envío</span>' +
                '<span>' + (order.shipping_cost > 0 ? formatCurrency(order.shipping_cost) : 'Gratis') + '</span>' +
            '</div>' +
            '<div class="eth-summary-row eth-summary-total">' +
                '<span>Total</span>' +
                '<span>' + formatCurrency(order.total || subtotal) + '</span>' +
            '</div>' +
        '</div>';
}

/* ============================= */
/* SESSION EXPIRED */
/* ============================= */

function showSessionExpired() {
    document.body.innerHTML =
        '<div style="max-width:500px;margin:80px auto;text-align:center">' +
            '<h2>Sesión expirada</h2>' +
            '<p>Por seguridad, tu enlace de acceso ya no es válido.</p>' +
            '<a href="mis-pedidos.html" class="btn-black">' +
                'Solicitar nuevo acceso' +
            '</a>' +
        '</div>';
}