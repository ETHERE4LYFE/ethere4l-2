import { ENDPOINTS } from './config.js';

// 1. Verificación de Auth (Gatekeeper)
const token = localStorage.getItem('admin_token');
if (!token) {
    window.location.href = 'login.html';
}

// 2. Estado Global
let ordersData = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
    
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('btn-refresh').addEventListener('click', fetchOrders);
    
    // Exponer funciones al window para usar en HTML onclick (Modal)
    window.closeModal = () => document.getElementById('tracking-modal').classList.add('hidden');
    window.submitTracking = submitTracking;
});

// 3. Core Functions
async function fetchOrders() {
    const tableBody = document.querySelector('#orders-table tbody');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-text">Sincronizando con Railway DB...</td></tr>';

    try {
        const res = await fetch(ENDPOINTS.ORDERS, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            logout(); // Token expirado
            return;
        }

        const data = await res.json();
        ordersData = data; // Guardar en memoria
        renderDashboard(data);

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = '<tr><td colspan="6" class="error-text">Error de conexión. Intente actualizar.</td></tr>';
    }
}

function renderDashboard(orders) {
    // A. Actualizar KPIs
    const totalSales = orders.reduce((sum, o) => {
        // Asumimos estructura del JSON guardado en DB (parsear 'data')
        const details = o.data; // Ya viene parseado del endpoint GET
        return sum + (details.pedido?.total || 0);
    }, 0);
    
    const pendingShipment = orders.filter(o => o.status === 'PAGADO').length;

    document.getElementById('kpi-total').innerText = `$${totalSales.toLocaleString('es-MX')}`;
    document.getElementById('kpi-count').innerText = orders.length;
    document.getElementById('kpi-pending').innerText = pendingShipment;

    // B. Renderizar Tabla
    const tbody = document.querySelector('#orders-table tbody');
    tbody.innerHTML = '';

    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('es-MX');
        const customer = order.data.cliente || {};
        const items = order.data.pedido.items || [];
        const itemsSummary = items.map(i => `${i.cantidad}x ${i.nombre} (${i.talla})`).join('<br>');
        
        let statusBadge = `<span class="badge pendiente">${order.status}</span>`;
        if (order.status === 'PAGADO') statusBadge = `<span class="badge pagado">PAGADO (Pend. Envío)</span>`;
        if (order.status === 'ENVIADO') statusBadge = `<span class="badge enviado">ENVIADO</span>`;

        // Botón de acción lógica
        let actionBtn = '';
        if (order.status === 'PAGADO') {
            actionBtn = `<button class="btn-action" onclick="openTrackingModal('${order.id}')">✈️ Enviar</button>`;
        } else if (order.status === 'ENVIADO') {
            actionBtn = `<button class="btn-disabled" disabled>✅ Completado</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${order.id.slice(-6)}</strong><br>
                <small>${date}</small>
            </td>
            <td>
                <strong>${customer.nombre}</strong><br>
                <small>${order.email}</small><br>
                <small style="color:#666">${customer.direccion?.ciudad || ''}, ${customer.direccion?.estado || ''}</small>
            </td>
            <td style="font-size:0.85em">${itemsSummary}</td>
            <td>$${order.data.pedido.total.toLocaleString('es-MX')}</td>
            <td>${statusBadge}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 4. Lógica de Tracking
window.openTrackingModal = (orderId) => {
    document.getElementById('modal-order-id').value = orderId;
    document.getElementById('tracking-input').value = '';
    document.getElementById('tracking-modal').classList.remove('hidden');
    document.getElementById('tracking-input').focus();
};

async function submitTracking() {
    const orderId = document.getElementById('modal-order-id').value;
    const trackingNumber = document.getElementById('tracking-input').value.trim();
    const btn = document.querySelector('.modal-actions .btn-primary');

    if (!trackingNumber) return alert("Ingresa un número de guía válido.");

    btn.disabled = true;
    btn.innerText = "Procesando...";

    try {
        const res = await fetch(ENDPOINTS.UPDATE_TRACKING, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orderId, trackingNumber })
        });

        const result = await res.json();

        if (result.success) {
            alert("✅ Orden actualizada y correo enviado al cliente.");
            window.closeModal();
            fetchOrders(); // Refrescar tabla
        } else {
            throw new Error(result.error || "Error desconocido");
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Confirmar Envío";
    }
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
}