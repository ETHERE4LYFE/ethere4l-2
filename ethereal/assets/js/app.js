// Ejemplo simple para tu archivo .js
let carrito = JSON.parse(localStorage.getItem('miCarrito')) || [];

function agregarAlCarrito(producto) {
    carrito.push(producto);
    localStorage.setItem('miCarrito', JSON.stringify(carrito));
    alert("Prenda añadida");
}