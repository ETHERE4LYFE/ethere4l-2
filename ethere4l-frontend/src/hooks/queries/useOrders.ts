// =========================================================
// HOOKS: Order Queries (TanStack React Query)
// =========================================================
// Fetches order data via the typed API layer.
// No direct fetch/axios usage.
// =========================================================

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/api-client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { OrdersResponse, OrderDetail } from '@/types/api.types';

export function useOrders() {
    return useQuery({
        queryKey: ['orders'],
        queryFn: () => apiGet<OrdersResponse>(API_ENDPOINTS.orders.list),
        retry: false,
    });
}

export function useOrder(orderId: string) {
    return useQuery({
        queryKey: ['orders', orderId],
        queryFn: () => apiGet<OrderDetail>(API_ENDPOINTS.orders.detail(orderId)),
        retry: false,
        enabled: !!orderId,
    });
}
