// =========================================================
// API: SSR Fetch Bridge (Server Components Only)
// =========================================================
// Uses native fetch with the internal backend origin.
// Designed for Server Components running under Node runtime.
//
// Client components MUST use Axios via @/lib/api/axios.ts.
// This module MUST NOT be imported from client components.
//
// INTERNAL_API_ORIGIN is server-only (no NEXT_PUBLIC_ prefix).
// =========================================================

import { cookies } from 'next/headers';
import { serverEnv } from '@/lib/config/server-env';

export async function serverFetch<T = unknown>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const res = await fetch(`${serverEnv.INTERNAL_API_ORIGIN}${path}`, {
        ...options,
        credentials: 'include',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            ...options?.headers,
        },
    });

    if (!res.ok) {
        throw new Error(`SSR Fetch failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
}
