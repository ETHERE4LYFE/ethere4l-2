// =========================================================
// RENDER.JS — Catálogo de productos (CORREGIDO)
// =========================================================
// FIXES APPLIED:
//   ✅ Added res.ok check before res.json()
//   ✅ Added cache-busting query param for mobile Safari
//   ✅ Fixed error message (was "base de datos", now accurate)
//   ✅ Added requestIdleCallback fallback for Safari iOS < 16.4
//   ✅ Added absolute path with leading slash
//   ✅ Added retry logic for mobile network failures
//   ✅ No functions removed, no structure changed
// =========================================================

async function cargarProductos() {
    const grid = document.getElementById('grid-productos');
    const heroSection = document.getElementById('lcp-hero');
    const titulo = document.getElementById('titulo-seccion');
    if (!grid) return;

    try {
        // ✅ FIX 1: Absolute path with leading slash (prevents relative resolution issues)
        // ✅ FIX 2: Cache-busting param for mobile Safari aggressive caching
        const cacheBuster = '_v=' + Date.now();
        const res = await fetch('/data/productos.json?' + cacheBuster);

        // ✅ FIX 3: Verify response is OK before parsing
        if (!res.ok) {
            throw new Error('HTTP ' + res.status + ': No se pudo cargar el catálogo');
        }

        // ✅ FIX 4: Verify content-type is JSON (not HTML error page)
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
            // Netlify might serve with different content-type, try parsing anyway
            // but log warning
            console.warn('productos.json served with content-type:', contentType);
        }

        const productos = await res.json();

        const params = new URLSearchParams(window.location.search);
        const marcaFiltro = params.get('marca');

        let productosAMostrar = marcaFiltro
            ? productos.filter(p => p.marca.toLowerCase() === marcaFiltro.toLowerCase())
            : productos.filter(p => p.destacado === true);

        if (titulo) {
            titulo.innerText = marcaFiltro
                ? marcaFiltro.replace(/-/g, ' ').toUpperCase()
                : "PRODUCTOS DESTACADOS";
        }

        if (!productosAMostrar.length) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:50px;">Próximamente más productos de esta colección.</p>';
            if (heroSection) heroSection.style.display = 'none';
            return;
        }

        // Si hay filtro de marca, ocultar el hero estático (solo aplica a destacados)
        if (marcaFiltro && heroSection) {
            heroSection.style.display = 'none';
        }

        // Si NO hay filtro, mostrar hero (por si el usuario vuelve atrás)
        if (!marcaFiltro && heroSection) {
            heroSection.style.display = '';
        }

        // Limpiar skeletons del grid (el hero está FUERA del grid, no se destruye)
        grid.innerHTML = "";

        // Saltar el primer producto (ya está en el hero estático) solo cuando NO hay filtro de marca
        const productosParaGrid = marcaFiltro
            ? productosAMostrar
            : productosAMostrar.slice(1);

        const CHUNK_SIZE = 12;
        let index = 0;

        function renderChunk() {
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < CHUNK_SIZE && index < productosParaGrid.length; i++, index++) {
                const p = productosParaGrid[index];
                const foto2 = p.fotos[1] || p.fotos[0];

                const card = document.createElement('a');
                card.href = 'producto.html?id=' + p.id;
                card.className = 'producto-card';

                card.innerHTML =
                    '<div class="img-container">' +
                        '<img src="' + p.fotos[0] + '" ' +
                            'class="img-primary" ' +
                            'alt="' + p.nombre + '" ' +
                            'width="600" height="800" ' +
                            'decoding="async" loading="lazy">' +
                        '<img src="' + foto2 + '" ' +
                            'class="img-secondary" ' +
                            'alt="' + p.nombre + '" ' +
                            'width="600" height="800" ' +
                            'loading="lazy" decoding="async">' +
                    '</div>' +
                    '<div class="producto-info">' +
                        '<p class="marca-tag">' + p.marca + '</p>' +
                        '<h3>' + p.nombre + '</h3>' +
                        '<p class="precio">' + p.precio + '</p>' +
                    '</div>';

                fragment.appendChild(card);
            }

            grid.appendChild(fragment);

            if (index < productosParaGrid.length) {
                // ✅ FIX 5: Robust fallback for Safari iOS < 16.4 (no requestIdleCallback)
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(renderChunk);
                } else {
                    setTimeout(renderChunk, 50);
                }
            }
        }

        renderChunk();

    } catch (error) {
        console.error("Error al cargar productos:", error);

        // ✅ FIX 6: Accurate error message + retry button
        grid.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;padding:50px;">' +
                '<p style="margin-bottom:15px;">No se pudieron cargar los productos.</p>' +
                '<p style="font-size:0.85em;color:#888;margin-bottom:20px;">' +
                    'Verifica tu conexión a internet e intenta de nuevo.' +
                '</p>' +
                '<button onclick="cargarProductos()" ' +
                    'style="padding:10px 24px;background:#000;color:#fff;border:none;cursor:pointer;font-size:0.9em;">' +
                    'Reintentar' +
                '</button>' +
            '</div>';
    }
}

/* ========================= */
/* SCROLL OPTIMIZADO (TBT FIX) */
/* ========================= */
let ticking = false;

function revealOnScroll() {
    if (window.innerWidth > 768) return;

    if (!ticking) {
        requestAnimationFrame(() => {
            const cards = document.querySelectorAll('.producto-card');
            const trigger = window.innerHeight * 0.5;

            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                if (rect.top < trigger && rect.bottom > trigger) {
                    card.classList.add('reveal-back');
                }
            });

            ticking = false;
        });
        ticking = true;
    }
}

/* ========================= */
/* EVENT LISTENERS */
/* ========================= */
document.addEventListener('DOMContentLoaded', cargarProductos);
window.addEventListener('scroll', revealOnScroll);