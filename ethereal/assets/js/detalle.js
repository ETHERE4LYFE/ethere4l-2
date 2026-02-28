document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) return;

    try {
        const response = await fetch('data/productos.json');
        const productos = await response.json();
        
        const producto = productos.find(item => String(item.id) === String(productId));

        if (producto) {
            renderizarProducto(producto);
            renderizarRelacionados(producto, productos);
        }
    } catch (error) {
        console.error("Error cargando el detalle:", error);
    }
});

function renderizarProducto(producto) {
    document.getElementById('marca-producto').textContent = producto.marca.replace(/-/g, ' ').toUpperCase();
    document.getElementById('nombre-producto').textContent = producto.nombre;
    document.getElementById('precio-producto').textContent = producto.precio;
    document.getElementById('desc-producto').textContent = producto.descripcion;

    const mainImg = document.getElementById('main-img');
    const thumbnails = document.getElementById('thumbnails');

    if (mainImg) {
        mainImg.src = producto.fotos[0];
        mainImg.alt = producto.nombre;
        mainImg.width = 600;
        mainImg.height = 800;
        mainImg.decoding = "async";
    }
    
    if (thumbnails) {
        thumbnails.innerHTML = ""; 
        producto.fotos.forEach((foto, index) => {
            const img = document.createElement('img');
            img.src = foto;
            img.alt = producto.nombre;
            img.width = 600;
            img.height = 800;
            img.loading = "lazy";
            img.decoding = "async";
            img.classList.add('thumb');
            if (index === 0) img.classList.add('active');
            img.addEventListener('click', () => {
                mainImg.src = foto;
                document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                img.classList.add('active');
            });
            thumbnails.appendChild(img);
        });
    }
}

function renderizarRelacionados(productoActual, todosLosProductos) {
    const contenedor = document.getElementById('related-products');
    const tituloRel = document.getElementById('titulo-relacionados');

    const normalizar = (texto) => texto.toLowerCase().replace(/[^a-z0-9]/g, '');
    const marcaActualNorm = normalizar(productoActual.marca);

    if (tituloRel) {
        tituloRel.innerText = `MÁS DE ${productoActual.marca.replace(/-/g, ' ').toUpperCase()}`;
    }

    const relacionados = todosLosProductos.filter(item => {
        return normalizar(item.marca) === marcaActualNorm && String(item.id) !== String(productoActual.id);
    });

    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (relacionados.length === 0) {
        contenedor.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Próximamente más de esta colección.</p>";
        return;
    }

    relacionados.forEach(p => { 
        contenedor.innerHTML += `
            <a href="producto.html?id=${p.id}" class="producto-card">
                <div class="img-container">
                <img 
                    src="${p.fotos[0]}"
                    alt="${p.nombre}"
                    width="600"
                    height="800"
                    loading="lazy"
                    decoding="async">
                </div>
                <div class="producto-info">
                    <p class="marca-tag">${p.marca}</p>
                    <h3>${p.nombre}</h3>
                    <p class="precio">${p.precio}</p>
                </div>
            </a>
        `;
    });
}