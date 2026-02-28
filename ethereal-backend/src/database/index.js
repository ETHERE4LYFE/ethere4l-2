// =========================================================
// DATABASE LAYER — Schema, Migrations, Inventory Seeding
// =========================================================
// Exports: db, dbPersistent, PRODUCTS_DB, CATALOG_DB
// This module handles all database initialization including:
//   - Static catalog loading from JSON files
//   - SQLite connection via better-sqlite3
//   - Schema creation (pedidos, customer_sessions, inventory)
//   - Index creation
//   - Column migrations (safe, idempotent)
//   - Inventory seeding from product catalog
//   - Safe-mode fallback (mock DB if connection fails)
// =========================================================

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { isRailway, RAILWAY_VOLUME } = require('../config/env');

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

// ================= DATABASE CONNECTION =================
const DATA_DIR = isRailway ? RAILWAY_VOLUME : path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'orders.db');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db;
let dbPersistent = false;

try {
    console.log(`🔌 Conectando DB en: ${DB_PATH}`);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // ---- Schema: pedidos ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id TEXT PRIMARY KEY,
            email TEXT,
            data TEXT,
            status TEXT DEFAULT 'PENDIENTE',
            payment_ref TEXT,
            confirmed_by TEXT,
            tracking_number TEXT,
            shipping_cost REAL,
            paid_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ---- Schema: customer_sessions ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS customer_sessions (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            user_agent TEXT,
            ip TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_customer_sessions_email ON customer_sessions(email);
        CREATE INDEX IF NOT EXISTS idx_customer_sessions_id ON customer_sessions(id);
    `);

    // ---- Indexes: pedidos ----
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_pedidos_email ON pedidos(email);
        CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
        CREATE INDEX IF NOT EXISTS idx_pedidos_payment_ref ON pedidos(payment_ref);
        CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);
    `);
    console.log('✅ Índices de pedidos verificados');

    // ---- Schema: inventory ----
    db.exec(`
        CREATE TABLE IF NOT EXISTS inventory (
            product_id TEXT PRIMARY KEY,
            stock INTEGER DEFAULT 0,
            reserved INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
    `);
    console.log('✅ Tabla inventory verificada');

    // ---- Inventory Seeding ----
    const inventoryCount = db.prepare(`SELECT COUNT(*) as c FROM inventory`).get().c;
    if (inventoryCount === 0 && PRODUCTS_DB.length > 0) {
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO inventory (product_id, stock) VALUES (?, ?)
        `);
        const seedTransaction = db.transaction((products) => {
            for (const p of products) {
                const stockValue = typeof p.stock === 'number' ? p.stock : 10;
                insertStmt.run(String(p.id), stockValue);
            }
        });
        seedTransaction(PRODUCTS_DB);
        console.log(`📦 Inventario inicializado con ${PRODUCTS_DB.length} productos`);
    }

    // ---- Column Migrations (safe, idempotent) ----
    try {
        const columns = db
            .prepare(`PRAGMA table_info(pedidos)`)
            .all()
            .map(col => col.name);

        if (!columns.includes('tracking_number')) {
            db.exec(`ALTER TABLE pedidos ADD COLUMN tracking_number TEXT`);
            console.log('🧱 Columna tracking_number añadida');
        }
        if (!columns.includes('shipping_cost')) {
            db.exec(`ALTER TABLE pedidos ADD COLUMN shipping_cost REAL`);
            console.log('🧱 Columna shipping_cost añadida');
        }
        if (!columns.includes('shipping_status')) {
            db.exec(`ALTER TABLE pedidos ADD COLUMN shipping_status TEXT DEFAULT 'CONFIRMADO'`);
            console.log('🧱 Columna shipping_status añadida');
        }
        if (!columns.includes('shipping_history')) {
            db.exec(`ALTER TABLE pedidos ADD COLUMN shipping_history TEXT`);
            console.log('🧱 Columna shipping_history añadida');
        }
        if (!columns.includes('carrier_code')) {
            db.exec(`ALTER TABLE pedidos ADD COLUMN carrier_code TEXT`);
            console.log('🧱 Columna carrier_code añadida');
        }
    } catch (e) {
        console.error('⚠️ Error en migración segura:', e.message);
    }

    dbPersistent = true;
    console.log('✅ DB Conectada y Persistente');

} catch (err) {
    console.error('❌ DB ERROR → SAFE MODE ACTIVO', err);
    db = {
        prepare: () => ({ run: () => { }, get: () => null, all: () => [] }),
        exec: () => { },
        transaction: (fn) => fn
    };
}

module.exports = {
    db,
    dbPersistent,
    PRODUCTS_DB,
    CATALOG_DB
};
