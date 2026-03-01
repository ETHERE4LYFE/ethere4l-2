// =========================================================
// DATABASE LAYER — Schema, Migrations, Inventory Seeding
// =========================================================
// Exports: db, dbPersistent (DEPRECATED), PRODUCTS_DB, CATALOG_DB
// Phase 9: PostgreSQL / Prisma Migration
// =========================================================

const prisma = require('./prismaClient');

// ================= STATIC CATALOG =================
let PRODUCTS_DB = [];
let CATALOG_DB = [];

try {
    PRODUCTS_DB = require('../../config/productos.json');
    console.log(`✅ productos.json cargado (${PRODUCTS_DB.length} productos)`);
} catch (err) {
    console.warn('⚠️ No se pudo cargar config/productos.json - Usando fallback frontend');
}

try {
    CATALOG_DB = require('../../config/catalogo.json');
    console.log(`✅ catalogo.json cargado (${CATALOG_DB.length} items)`);
} catch (err) {
    console.warn('⚠️ No se pudo cargar config/catalogo.json');
}

// ================= POSTGRESQL PRISMA SETUP =================
(async () => {
    try {
        // Check if products exist in PostgreSQL
        const currentCount = await prisma.product.count();
        if (currentCount === 0 && PRODUCTS_DB.length > 0) {
            console.log(`📦 Seed de inventario en PostgreSQL: Insertando ${PRODUCTS_DB.length} productos...`);

            // Map the JSON structure to Prisma Product model
            const productsToInsert = PRODUCTS_DB.map(p => ({
                id: String(p.id),
                nombre: p.nombre || String(p.id),
                precio: Number(p.precio) || 0,
                talla: p.talla || null,
                imagen: p.imagen || null,
                peso: Number(p.peso) || 0,
                descripcion: p.descripcion || null,
                stock: typeof p.stock === 'number' ? p.stock : 10
            }));

            await prisma.product.createMany({
                data: productsToInsert,
                skipDuplicates: true
            });

            console.log(`✅ Seed completado en PostgreSQL`);
        }
    } catch (e) {
        console.error('❌ Error inicializando PostgreSQL (Prisma):', e);
    }
})();

// Legacy exports to avoid breaking controllers that haven't been fully migrated
// DB is no longer the sqlite db connection, it's just Prisma
module.exports = {
    db: prisma, // controllers or services expecting `db.prepare` will fail if not migrated. But we migrated services!
    dbPersistent: true, // Prisma throws if connection fails, so we assume persistent = true
    PRODUCTS_DB,
    CATALOG_DB
};
