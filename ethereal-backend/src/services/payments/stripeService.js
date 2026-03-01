// =========================================================
// SERVICE: Payments — Stripe checkout + webhook handling
// =========================================================
// No Express req/res. Pure business logic.
// =========================================================

const { stripe, STRIPE_WEBHOOK_SECRET, FRONTEND_URL } = require('../../config/env');
const { PRODUCTS_DB } = require('../../database');
const { logger, incrementErrorCount } = require('../../utils/logger');
const { parseSafeNumber } = require('../../utils/helpers');

function verifyWebhookSignature(rawBody, signature) {
    return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}

function buildLineItems(items) {
    const lineItems = [];
    let pesoTotal = 0;
    let serverSubtotal = 0;

    for (const item of items) {
        const dbProduct = PRODUCTS_DB.length > 0
            ? PRODUCTS_DB.find(p => String(p.id) === String(item.id))
            : null;

        const productFinal = dbProduct || item;
        const rawPrice = dbProduct ? dbProduct.precio : item.precio;
        const precioLimpio = parseSafeNumber(rawPrice, 0);

        if (precioLimpio <= 0) {
            throw new Error(`PRECIO_INVALIDO:${item.id}`);
        }

        const cantidadLimpia = parseSafeNumber(item.cantidad, 1);
        const pesoLimpio = parseSafeNumber(productFinal.peso, 0.6);
        pesoTotal += pesoLimpio * cantidadLimpia;
        serverSubtotal += precioLimpio * cantidadLimpia;

        let productImages = [];
        if (dbProduct && dbProduct.fotos && dbProduct.fotos.length > 0) {
            productImages = [dbProduct.fotos[0]];
        } else if (item.imagen && item.imagen.startsWith('http')) {
            productImages = [item.imagen];
        }

        lineItems.push({
            price_data: {
                currency: 'mxn',
                product_data: {
                    name: productFinal.nombre,
                    images: productImages,
                    metadata: {
                        talla: item.talla,
                        id_producto: item.id
                    }
                },
                unit_amount: Math.round(precioLimpio * 100),
            },
            quantity: cantidadLimpia,
        });
    }

    return { lineItems, pesoTotal, serverSubtotal };
}

function calculateShipping(items, pesoTotal) {
    const totalItems = items.reduce((acc, item) => acc + parseSafeNumber(item.cantidad, 1), 0);
    let costoEnvio = 0;

    if (totalItems === 1) costoEnvio = 900;
    else if (totalItems === 2) costoEnvio = 1000;
    else if (totalItems === 3) costoEnvio = 1300;
    else costoEnvio = 1500;

    if (pesoTotal > 10.0) costoEnvio += 500;

    return costoEnvio;
}

function buildOrderSnapshot(items, serverSubtotal, costoEnvio) {
    return {
        items: items.map(item => {
            const dbProduct = PRODUCTS_DB.find(p => String(p.id) === String(item.id)) || item;
            const precio = parseSafeNumber(dbProduct.precio || item.precio, 0);
            const cantidad = parseSafeNumber(item.cantidad, 1);
            return {
                id: item.id,
                nombre: dbProduct.nombre || item.nombre,
                imagen: (dbProduct.fotos && dbProduct.fotos[0]) || item.imagen || null,
                talla: item.talla || null,
                cantidad: cantidad,
                precio: precio,
                subtotal: precio * cantidad
            };
        }),
        subtotal: serverSubtotal,
        envio: costoEnvio,
        total: serverSubtotal + costoEnvio
    };
}

async function createCheckoutSession(orderId, customerEmail, lineItems, costoEnvio) {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        customer_email: customerEmail,
        metadata: { order_id: orderId },
        shipping_options: [
            {
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: { amount: costoEnvio * 100, currency: 'mxn' },
                    display_name: 'Envío Logístico Privado (Tracked)',
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 10 },
                        maximum: { unit: 'business_day', value: 15 },
                    },
                },
            },
        ],
        success_url: `${FRONTEND_URL}/success.html`,
        cancel_url: `${FRONTEND_URL}/pedido.html`,
    });

    return session;
}

module.exports = {
    verifyWebhookSignature,
    buildLineItems,
    calculateShipping,
    buildOrderSnapshot,
    createCheckoutSession
};
