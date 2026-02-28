// ==========================================
// ANALYTICS.JS - ETHERE4L (GA4 SAFE LAYER)
// ==========================================

window.Analytics = {
    trackPurchase(order) {
        if (!order || !order.id) return;

        if (typeof gtag !== 'function') return;

        gtag('event', 'purchase', {
            transaction_id: order.id,
            value: order.total,
            currency: 'MXN',
            shipping: order.shipping_cost || 0,
        });

        console.log('[GA4] Purchase tracked:', order.id);
    },

    trackTrackingView(orderId, status) {
        if (typeof gtag !== 'function') return;

        gtag('event', 'order_tracking_viewed', {
            order_id: orderId,
            order_status: status
        });
    },

    trackUpsellClick(productName, location) {
        if (typeof gtag !== 'function') return;

        gtag('event', 'select_item', {
            item_list_name: location,
            items: [{ item_name: productName }]
        });
    }
};
