// =========================================================
// API: Error Normalizer
// =========================================================
// Converts Axios errors into predictable, typed structures.
// All API calls must pass through this normalization layer.
// =========================================================

import { AxiosError } from 'axios';

export interface NormalizedError {
    status: number;
    message: string;
}

export function normalizeApiError(error: unknown): NormalizedError {
    if (error instanceof AxiosError && error.response) {
        const data = error.response.data as Record<string, unknown> | undefined;
        return {
            status: error.response.status,
            message:
                (typeof data?.message === 'string' ? data.message : null) ??
                (typeof data?.error === 'string' ? data.error : null) ??
                'API request failed',
        };
    }

    return {
        status: 500,
        message: 'Unknown network error',
    };
}
