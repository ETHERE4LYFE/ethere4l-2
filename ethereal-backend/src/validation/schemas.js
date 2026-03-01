// =========================================================
// VALIDATION: Zod Schemas for all API inputs
// =========================================================

const { z } = require('zod');

// --- Admin Login ---
const adminLoginSchema = z.object({
    password: z.string().min(1, 'Password requerido').max(200)
});

// --- Magic Link ---
const magicLinkSchema = z.object({
    email: z.string().email('Email inválido').max(254)
});

// --- Checkout Item ---
const checkoutItemSchema = z.object({
    id: z.union([z.string(), z.number()]),
    nombre: z.string().optional(),
    precio: z.number().optional(),
    cantidad: z.union([z.number(), z.string()]),
    talla: z.string().optional(),
    imagen: z.string().optional(),
    peso: z.number().optional()
});

// --- Checkout Session ---
const checkoutSessionSchema = z.object({
    items: z.array(checkoutItemSchema).min(1, 'Se requiere al menos un producto').max(20),
    customer: z.object({
        email: z.string().email('Email inválido').max(254),
        nombre: z.string().max(200).optional(),
        telefono: z.string().max(30).optional(),
        direccion: z.string().max(500).optional(),
        ciudad: z.string().max(100).optional(),
        estado: z.string().max(100).optional(),
        cp: z.string().max(10).optional(),
        notas: z.string().max(1000).optional()
    })
});

// --- Shipping Update ---
const shippingUpdateSchema = z.object({
    orderId: z.string().min(1, 'Order ID requerido').max(100),
    status: z.enum(['CONFIRMADO', 'EMPAQUETADO', 'EN_TRANSITO', 'ENTREGADO']),
    trackingNumber: z.string().max(100).optional().nullable(),
    carrier: z.string().max(50).optional().nullable(),
    description: z.string().max(500).optional().nullable()
});

// --- Order Tracking (params) ---
const orderTrackingSchema = z.object({
    orderId: z.string().min(1).max(100)
});

module.exports = {
    adminLoginSchema,
    magicLinkSchema,
    checkoutSessionSchema,
    shippingUpdateSchema,
    orderTrackingSchema
};
