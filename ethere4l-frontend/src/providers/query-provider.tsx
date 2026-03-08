'use client';

// =========================================================
// PROVIDER: QueryClient (Global, Deterministic)
// =========================================================
// Instantiates QueryClient once. Prevents re-instantiation
// on re-render via useState lazy initializer.
// No UI logic. No network calls.
// =========================================================

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
                staleTime: 0,
            },
        },
    });
}

export default function QueryProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [queryClient] = useState(makeQueryClient);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
