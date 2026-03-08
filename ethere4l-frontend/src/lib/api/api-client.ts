// =========================================================
// API: Typed Request Abstraction
// =========================================================
// All HTTP requests MUST go through these helpers.
// Direct axios usage outside this module is prohibited.
//
// React Query hooks consume these functions:
//   queryFn: () => apiGet<Product[]>(API_ENDPOINTS.products.list)
//
// This module is framework-agnostic — no React imports.
// =========================================================

import apiClient from '@/lib/api/axios';
import { normalizeApiError } from './error-normalizer';

export async function apiGet<T>(url: string): Promise<T> {
    try {
        const res = await apiClient.get<T>(url);
        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
    try {
        const res = await apiClient.post<T>(url, body);
        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
    try {
        const res = await apiClient.put<T>(url, body);
        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
    try {
        const res = await apiClient.patch<T>(url, body);
        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function apiDelete<T>(url: string): Promise<T> {
    try {
        const res = await apiClient.delete<T>(url);
        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}
