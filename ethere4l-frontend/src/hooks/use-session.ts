// =========================================================
// HOOKS: Authentication Session Layer
// =========================================================
// Derives session state exclusively from GET /api/auth/me.
// React Query cache is the single source of truth.
//
// No token access. No cookie parsing. No localStorage.
// No refresh logic — handled by Axios interceptor.
//
// Client-side only. Server Components must use serverFetch.
// =========================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/api-client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { User } from '@/types/api.types';
import type { NormalizedError } from '@/lib/api/error-normalizer';

// ---------------------------------------------------------
// QUERY KEY (Deterministic, reusable)
// ---------------------------------------------------------
const SESSION_QUERY_KEY = ['auth', 'session'] as const;

// ---------------------------------------------------------
// SESSION FETCHER
// ---------------------------------------------------------
// 200 → User object (authenticated)
// 401 → null (not authenticated)
// Other → propagate error
// ---------------------------------------------------------
async function fetchSession(): Promise<User | null> {
    try {
        const user = await apiGet<User>(API_ENDPOINTS.auth.me);
        return user;
    } catch (error: unknown) {
        const normalized = error as NormalizedError;
        if (normalized.status === 401) {
            return null;
        }
        throw error;
    }
}

// ---------------------------------------------------------
// useSession — Authenticated user state
// ---------------------------------------------------------
// data = User   → authenticated
// data = null   → not authenticated
// isLoading     → resolving
// ---------------------------------------------------------
export function useSession() {
    return useQuery({
        queryKey: SESSION_QUERY_KEY,
        queryFn: fetchSession,
        staleTime: 60_000,
        retry: false,
    });
}

// ---------------------------------------------------------
// useLogout — Session teardown
// ---------------------------------------------------------
// 1. POST /api/auth/logout (backend clears cookies)
// 2. Set session cache to null immediately
// ---------------------------------------------------------
export function useLogout() {
    const queryClient = useQueryClient();

    return async () => {
        await apiPost(API_ENDPOINTS.auth.logout);
        queryClient.setQueryData(SESSION_QUERY_KEY, null);
    };
}
