// =========================================================
// TYPES: API Response Contracts
// =========================================================
// Shared type definitions for all API communication.
// Must remain compatible with backend response shapes.
// =========================================================

// ---------------------------------------------------------
// Response Envelope
// ---------------------------------------------------------
export interface ApiSuccess<T> {
    success: true;
    data: T;
}

export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------
// Domain Entities
// ---------------------------------------------------------
export interface Product {
    id: string;
    name: string;
    price: number;
    slug: string;
    image: string;
}

export interface User {
    id: string;
    email: string;
    role: string;
}

// ---------------------------------------------------------
// Order Entities
// ---------------------------------------------------------
export interface OrderSummary {
    id: string;
    status: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
    itemCount: number;
}

export interface OrderProduct {
    id: string;
    name: string;
    imageUrl: string | null;
}

export interface OrderItem {
    quantity: number;
    price: number;
    product: OrderProduct;
}

export interface OrderDetail {
    id: string;
    status: string;
    totalAmount: number;
    currency: string;
    createdAt: string;
    items: OrderItem[];
}

export interface OrdersResponse {
    orders: OrderSummary[];
}

// ---------------------------------------------------------
// Admin Entities
// ---------------------------------------------------------
export interface AdminProduct {
    id: string;
    nombre: string;
    precio: number;
    talla: string | null;
    imagen: string | null;
    stock: number;
    descripcion: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminOrderItem {
    quantity: number;
    price: number;
    productName: string;
}

export interface AdminOrder {
    id: string;
    email: string;
    status: string;
    total: number;
    createdAt: string;
    items: AdminOrderItem[];
}

export interface AdminOrdersResponse {
    orders: AdminOrder[];
    total: number;
    page: number;
    limit: number;
}

export interface AdminAnalytics {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    productsSold: number;
    activeReservations: number;
}
