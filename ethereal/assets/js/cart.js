// ==========================================
// CART.JS - Lógica Global del Carrito (CORREGIDO)
// ==========================================
// FIXES APPLIED:
//   ✅ FIX 1: PRODUCTION_API typo → now reads from ETHERE4L_CONFIG
//   ✅ FIX 2: Removed hardcoded API_PRODUCTION
//   ✅ FIX 3: Added credentials: 'include' to checkout fetch
//   ✅ FIX 4: Added res.ok check before res.json()
//   ✅ FIX 5: Added timeout for mobile networks
//   ✅ All existing functions preserved 1:1
//   ✅ No functions removed
// ==========================================

// Clave para guardar en el navegador
const CART_KEY = 'ethereal_cart_v1';

// ✅ FIX 1: Read API URL from centralized config (loaded via <script> in HTML)
// Falls back to hardcoded URL if config not loaded yet
function getApiBase() {
    if (window.ETHERE4L_CONFIG && window.ETHERE4L_CONFIG.API_BASE) {
        return window.ETHERE4L_CONFIG.API_BASE;
    }
    // Fallback — should never reach here if config is loaded properly
    console.warn('ETHERE4L_CONFIG not available, using fallback API URL');
    return 'https://api.ethere4l.com';
}


// 1. Obtener carrito actual
function getCart() {
    try {
        const cart = localStorage.getItem(CART_KEY);
        let parsedCart = cart ? JSON.parse(cart) : [];
        if (!Array.isArray(parsedCart)) return [];
        return parsedCart;
    } catch (e) {
        console.error("Error recuperando el carrito", e);
        return [];
    }
}

// 2. Guardar carrito y notificar eventos
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // Dispara evento para que otros scripts (header, checkout) se enteren
    window.dispatchEvent(new Event('cartUpdated'));
    // Si existe la función visual del contador, la ejecutamos
    if (typeof updateCartCount === 'function') updateCartCount();
}

// 3. Agregar producto
function addToCart(producto) {
    let cart = getCart();

    // Validación estricta de ID y Talla
    if (!producto.id || !producto.talla) {
        console.error("Error: Producto sin ID o Talla", producto);
        return;
    }

    const prodId = String(producto.id); // Forzar ID a string
    const prodTalla = String(producto.talla);

    // --- SANITIZACIÓN DE PRECIO ---
    let precioNumerico = 0;

    if (typeof producto.precio === 'number') {
        precioNumerico = producto.precio;
    } else {
        // Convertir "$2800mxn" o "None" a número
        const precioString = String(producto.precio).replace(/[^0-9.]/g, '');
        precioNumerico = parseFloat(precioString);
    }

    // Si falló la conversión o es NaN, forzar 0
    if (isNaN(precioNumerico)) precioNumerico = 0;

    // Buscar si ya existe este item (mismo ID y misma Talla)
    const existingItem = cart.find(item => String(item.id) === prodId && item.talla === prodTalla);

    if (existingItem) {
        existingItem.cantidad += 1;
        existingItem.precio = precioNumerico; // Actualizar precio por si cambió
    } else {
        cart.push({
            id: prodId,
            nombre: String(producto.nombre || "Producto"),
            precio: precioNumerico,
            talla: prodTalla,
            imagen: producto.imagen || "",
            cantidad: 1,
            // --- Propiedades para cálculo logístico ---
            peso: Number(producto.peso) || 0.6, // Default 0.6kg
            sourcing: producto.sourcing || false
        });
    }

    saveCart(cart);
    console.log('✅ Agregado: ' + producto.nombre + ' | $' + precioNumerico);
    alert("Producto agregado al carrito"); // Feedback visual simple
}

// 4. Calcular Total
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        const p = Number(item.precio) || 0;
        const q = Number(item.cantidad) || 0;
        return total + (p * q);
    }, 0);
}

// 5. Funciones Auxiliares Globales (Window)

window.removeFromCart = function(id, talla) {
    let cart = getCart();
    // Filtrar manteniendo tipos consistentes
    cart = cart.filter(item => !(String(item.id) === String(id) && item.talla === talla));
    saveCart(cart);
};

window.updateItemQuantity = function(id, talla, change) {
    let cart = getCart();
    const item = cart.find(i => String(i.id) === String(id) && i.talla === talla);

    if (item) {
        const nuevaCantidad = item.cantidad + change;
        if (nuevaCantidad > 0) {
            item.cantidad = nuevaCantidad;
            saveCart(cart);
        } else {
            // Si baja a 0, eliminamos
            window.removeFromCart(id, talla);
        }
    }
};

window.clearCart = function() {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new Event('cartUpdated'));
    if (typeof updateCartCount === 'function') updateCartCount();
};

/* ==========================================================================
   INTEGRACIÓN STRIPE & BACKEND (Checkout Seguro) — CORREGIDO
   ========================================================================== */

/**
 * Envía el carrito + datos del cliente al backend para iniciar sesión de Stripe.
 * @param {string} btnId - ID del botón que dispara la acción (para efecto de carga)
 */
window.iniciarCheckoutSeguro = async function(btnId) {
    btnId = btnId || 'btn-checkout';
    var cart = getCart();

    if (cart.length === 0) {
        alert("Tu bolsa está vacía.");
        return;
    }

    // UI Loading
    var btn = document.getElementById(btnId);
    var textoOriginal = "";
    if (btn) {
        textoOriginal = btn.innerText;
        btn.innerText = "Conectando con Stripe...";
        btn.disabled = true;
    }

    try {
        // 1. Intentar recuperar datos del cliente (Si vienen desde checkout.js)
        var clienteData = null;
        try {
            var storedData = sessionStorage.getItem('checkout_cliente');
            if (storedData) {
                clienteData = JSON.parse(storedData);
            }
        } catch (e) {
            console.warn("No se encontraron datos de cliente en sessionStorage");
        }

        // ✅ FIX 2: Use centralized config function instead of broken variable
        var apiBase = getApiBase();
        var apiUrl = apiBase + '/api/create-checkout-session';

        console.log('🔄 Iniciando Checkout hacia: ' + apiUrl);

        // ✅ FIX 3: Added timeout for mobile networks
        var controller = new AbortController();
        var timeout = setTimeout(function() {
            controller.abort();
        }, 20000); // 20 second timeout for slow mobile

        // 3. Petición al Backend
        // ✅ FIX 4: Added credentials: 'include' for cross-origin cookie support
        var response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            signal: controller.signal,
            body: JSON.stringify({
                items: cart,
                customer: clienteData
            })
        });

        clearTimeout(timeout);

        // ✅ FIX 5: Check response.ok BEFORE parsing JSON
        if (!response.ok) {
            var errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                throw new Error('Error del servidor (HTTP ' + response.status + ')');
            }
            throw new Error(errorData.error || 'Error del servidor (HTTP ' + response.status + ')');
        }

        var data = await response.json();

        // 4. Manejo de Respuesta
        if (data.url) {
            console.log("✅ Sesión creada, redirigiendo...");
            window.location.href = data.url; // Redirige a Stripe
        } else {
            throw new Error(data.error || "No se recibió URL de pago");
        }

    } catch (error) {
        console.error("❌ Checkout Error:", error);

        // ✅ FIX 6: Better error messages for mobile users
        var userMessage = "No se pudo iniciar el pago.";
        if (error.name === 'AbortError') {
            userMessage = "La conexión tardó demasiado. Verifica tu internet e intenta de nuevo.";
        } else if (error.message) {
            userMessage = error.message;
        }

        alert(userMessage);

        // Restaurar botón
        if (btn) {
            btn.innerText = textoOriginal;
            btn.disabled = false;
        }
    }
};