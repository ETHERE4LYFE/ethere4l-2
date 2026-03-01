// =========================================================
// CONTROLLER: Product — catalog and products endpoints
// =========================================================

const { PRODUCTS_DB, CATALOG_DB } = require('../database');
const { logger } = require('../utils/logger');

function getCatalog(req, res) {
    try {
        if (CATALOG_DB.length > 0) return res.json(CATALOG_DB);
        if (PRODUCTS_DB.length > 0) return res.json(PRODUCTS_DB);
        res.status(404).json({ error: 'Catálogo no disponible' });
    } catch (e) {
        logger.error('CATALOG_ENDPOINT_ERROR', { error: e.message });
        res.status(500).json({ error: 'Error cargando catálogo' });
    }
}

function getProducts(req, res) {
    try {
        if (PRODUCTS_DB.length > 0) return res.json(PRODUCTS_DB);
        res.status(404).json({ error: 'Productos no disponibles' });
    } catch (e) {
        logger.error('PRODUCTS_ENDPOINT_ERROR', { error: e.message });
        res.status(500).json({ error: 'Error cargando productos' });
    }
}

module.exports = { getCatalog, getProducts };
