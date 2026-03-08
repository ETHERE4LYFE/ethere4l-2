// =========================================================
// API: Enterprise Axios Client (Singleton)
// =========================================================
// Single axios instance for all API communication.
// Enforces same-domain reverse proxy boundary.
//
// Refresh Control Layer:
//   - Single-flight refresh mutex
//   - Collapsed request queue for concurrent 401s
//   - BroadcastChannel multi-tab synchronization
//   - Exponential backoff for 429 responses
//   - Fail-closed on refresh failure
//
// No token access. No cookie parsing. No localStorage.
// Cookies are HttpOnly — handled by the browser.
// =========================================================

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/lib/config/env';

// ---------------------------------------------------------
// AXIOS INSTANCE
// ---------------------------------------------------------
const apiClient = axios.create({
    baseURL: env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
    timeout: 8000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// ---------------------------------------------------------
// REFRESH MUTEX STATE
// ---------------------------------------------------------
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// ---------------------------------------------------------
// REQUEST QUEUE (Collapsed retry for concurrent 401s)
// ---------------------------------------------------------
interface QueueEntry {
    resolve: () => void;
    reject: (error: unknown) => void;
}

const requestQueue: QueueEntry[] = [];

function processQueue(error?: unknown): void {
    requestQueue.forEach((p) => {
        if (error) {
            p.reject(error);
        } else {
            p.resolve();
        }
    });
    requestQueue.length = 0;
}

// ---------------------------------------------------------
// BROADCAST CHANNEL (Multi-Tab Refresh Coordination)
// ---------------------------------------------------------
let refreshChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    refreshChannel = new BroadcastChannel('auth-refresh');

    refreshChannel.onmessage = (event: MessageEvent<string>) => {
        if (event.data === 'refresh:success') {
            processQueue();
        } else if (event.data === 'refresh:failure') {
            processQueue(new Error('Refresh failed in another tab'));
        }
    };
}

// ---------------------------------------------------------
// BACKOFF UTILITY
// ---------------------------------------------------------
const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

const MAX_429_RETRIES = 2;
const BACKOFF_BASE_MS = 1000;

// ---------------------------------------------------------
// REFRESH EXECUTOR
// ---------------------------------------------------------
// Uses native fetch to bypass the Axios interceptor entirely,
// preventing infinite 401 loops. The browser automatically
// includes HttpOnly cookies for same-origin requests.
// ---------------------------------------------------------
async function executeRefresh(): Promise<void> {
    const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
    }
}

// ---------------------------------------------------------
// EXTENDED REQUEST CONFIG (retry tracking)
// ---------------------------------------------------------
interface RetryConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
    _retryCount429?: number;
}

// ---------------------------------------------------------
// RESPONSE INTERCEPTOR — Refresh Orchestration
// ---------------------------------------------------------
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryConfig | undefined;

        // Network failure — fail closed
        if (!error.response || !originalRequest) {
            return Promise.reject(error);
        }

        const status = error.response.status;

        // ---------------------------------------------------
        // 403 — Immediate reject (quarantine / reuse detection)
        // ---------------------------------------------------
        if (status === 403) {
            return Promise.reject(error);
        }

        // ---------------------------------------------------
        // 429 — Exponential backoff retry (max 2 attempts)
        // ---------------------------------------------------
        if (status === 429) {
            const retryCount = originalRequest._retryCount429 ?? 0;
            if (retryCount >= MAX_429_RETRIES) {
                return Promise.reject(error);
            }
            originalRequest._retryCount429 = retryCount + 1;
            const backoffMs = BACKOFF_BASE_MS * Math.pow(2, retryCount);
            await delay(backoffMs);
            return apiClient(originalRequest);
        }

        // ---------------------------------------------------
        // 401 — Refresh orchestration
        // ---------------------------------------------------
        if (status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        // If another refresh is already in-flight, queue this request
        if (isRefreshing) {
            return new Promise<ReturnType<typeof apiClient>>((resolve, reject) => {
                requestQueue.push({
                    resolve: () => resolve(apiClient(originalRequest)),
                    reject,
                });
            });
        }

        // This request initiates a refresh
        isRefreshing = true;

        refreshChannel?.postMessage('refresh:start');

        refreshPromise = executeRefresh()
            .then(() => {
                processQueue();
                refreshChannel?.postMessage('refresh:success');
            })
            .catch((err: unknown) => {
                processQueue(err);
                refreshChannel?.postMessage('refresh:failure');
                throw err;
            })
            .finally(() => {
                isRefreshing = false;
                refreshPromise = null;
            });

        try {
            await refreshPromise;
            return apiClient(originalRequest);
        } catch (err) {
            return Promise.reject(err);
        }
    }
);

export default apiClient;
