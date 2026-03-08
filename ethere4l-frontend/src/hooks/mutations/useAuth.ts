// =========================================================
// HOOKS: Auth Mutations (Login & Register)
// =========================================================
// React Query mutations for authentication actions.
// Session cache invalidated on success.
// =========================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api/api-client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { User } from '@/types/api.types';

// ---------------------------------------------------------
// useLogin — POST /api/auth/login
// ---------------------------------------------------------
export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { email: string; password: string }) =>
            apiPost<User>(API_ENDPOINTS.auth.login, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
        },
    });
}

// ---------------------------------------------------------
// useRegister — POST /api/auth/register
// ---------------------------------------------------------
export function useRegister() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name: string; email: string; password: string }) =>
            apiPost<User>(API_ENDPOINTS.auth.register, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
        },
    });
}
