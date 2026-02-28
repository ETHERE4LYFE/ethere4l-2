document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Elementos del DOM ---
    const menuToggle = document.getElementById('mobile-menu');
    const navList = document.querySelector('.nav-list');
    const listaMarcas = document.getElementById('lista-marcas');
    const cartIconContainer = document.querySelector('.cart-icon-nav a'); // El enlace del carrito

    // --- 2. Lógica del Menú Hamburguesa ---
    if (menuToggle && navList) {
        // Remover listeners viejos clonando el nodo (truco de seguridad)
        const newMenuToggle = menuToggle.cloneNode(true);
        menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);

        newMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el click cierre el menú inmediatamente
            navList.classList.toggle('active');
            console.log("Menú hamburguesa clickeado. Estado:", navList.classList.contains('active'));
        });

        // Cerrar menú al hacer click fuera
        document.addEventListener('click', (e) => {
            if (navList.classList.contains('active') && !navList.contains(e.target) && !newMenuToggle.contains(e.target)) {
                navList.classList.remove('active');
            }
        });
    }

    // --- 3. Cargar Marcas Dinámicas ---
    // Solo ejecuta si el elemento existe (para evitar errores en páginas sin dropdown)
    if (listaMarcas) {
        fetch('data/productos.json')
            .then(response => response.json())
            .then(productos => {
                const marcasUnicas = [...new Set(productos.map(p => p.marca))];
                
                listaMarcas.innerHTML = ""; // Limpiar
                marcasUnicas.forEach(marca => {
                    const li = document.createElement('li');
                    // Capitalizar primera letra
                    const nombreMarca = marca.charAt(0).toUpperCase() + marca.slice(1);
                    li.innerHTML = `<a href="catalogo.html?marca=${marca}">${nombreMarca}</a>`;
                    listaMarcas.appendChild(li);
                });
            })
            .catch(err => console.error("Error cargando marcas:", err));
    }

    // --- 4. Inicializar Contador del Carrito ---
    updateCartCount();
});

// --- 5. Función Global para Actualizar Contador ---
// Esta función es llamada por cart.js cada vez que hay cambios
window.updateCartCount = function() {
    // Verificar si existe la función getCart (dependencia de cart.js)
    if (typeof getCart !== 'function') return;

    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

    // Buscar o crear el badge del contador
    let badge = document.getElementById('cart-count-badge');
    const cartIconNav = document.querySelector('.cart-icon-nav a');

    if (cartIconNav) {
        if (!badge) {
            badge = document.createElement('span');
            badge.id = 'cart-count-badge';
            // Estilos inline para asegurar visibilidad (puedes moverlos a CSS después)
            badge.style.cssText = "background: red; color: white; font-size: 0.7rem; font-weight: bold; padding: 2px 6px; border-radius: 50%; position: absolute; top: -5px; right: -10px;";
            cartIconNav.style.position = 'relative'; // Necesario para posicionar el badge
            cartIconNav.appendChild(badge);
        }

        // Mostrar u ocultar según cantidad
        if (totalItems > 0) {
            badge.innerText = totalItems;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
};

// Escuchar evento personalizado de cart.js (Doble seguridad)
window.addEventListener('cartUpdated', window.updateCartCount);