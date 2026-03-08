// =========================================================
// API: Centralized Endpoint Registry (Immutable)
// =========================================================
// All endpoint paths MUST be defined here.
// No string literals allowed elsewhere in the codebase.
// Dynamic endpoints use parameterized functions.
// =========================================================

export const API_ENDPOINTS = {
    health: {
        live: '/health/live',
    },

    auth: {
        login: '/auth/login',
        register: '/auth/register',
        logout: '/auth/logout',
        refresh: '/auth/refresh',
        me: '/auth/me',
    },

    products: {
        list: '/products',
        detail: (slug: string) => `/products/${slug}`,
    },

    orders: {
        create: '/orders',
        list: '/orders',
        detail: (id: string) => `/orders/${id}`,
    },

    admin: {
        products: '/admin/rbac/products',
        productById: (id: string) => `/admin/rbac/products/${id}`,
        orders: '/admin/rbac/orders',
        analytics: '/admin/rbac/analytics/overview',
    },
} as const;
