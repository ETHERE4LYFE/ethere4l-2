'use client';

// =========================================================
// PAGE: /admin/analytics — Analytics Overview
// =========================================================

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/api-client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { AdminAnalytics } from '@/types/api.types';

export default function AdminAnalyticsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'analytics'],
        queryFn: () => apiGet<AdminAnalytics>(API_ENDPOINTS.admin.analytics),
        retry: false,
    });

    if (isLoading) {
        return (
            <div>
                <h1 className="text-2xl font-black text-white tracking-widest mb-8">ANALYTICS</h1>
                <p className="text-zinc-500 text-sm">Loading analytics...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div>
                <h1 className="text-2xl font-black text-white tracking-widest mb-8">ANALYTICS</h1>
                <p className="text-red-400 text-sm">Failed to load analytics.</p>
            </div>
        );
    }

    const metrics = [
        {
            label: 'TOTAL REVENUE',
            value: `$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: 'From completed orders',
            accent: 'border-green-500/30',
        },
        {
            label: 'TOTAL ORDERS',
            value: data.totalOrders.toLocaleString(),
            sub: 'All time',
            accent: 'border-blue-500/30',
        },
        {
            label: 'PRODUCTS SOLD',
            value: data.productsSold.toLocaleString(),
            sub: 'Total units',
            accent: 'border-purple-500/30',
        },
        {
            label: 'CUSTOMERS',
            value: data.totalCustomers.toLocaleString(),
            sub: 'Registered accounts',
            accent: 'border-amber-500/30',
        },
        {
            label: 'ACTIVE RESERVATIONS',
            value: data.activeReservations.toLocaleString(),
            sub: 'Pending checkout',
            accent: 'border-red-500/30',
        },
    ];

    return (
        <div>
            <h1 className="text-2xl font-black text-white tracking-widest mb-8">ANALYTICS</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.map((m) => (
                    <div
                        key={m.label}
                        className={`bg-zinc-900 border-l-4 ${m.accent} border border-white/5 rounded-xl p-6`}
                    >
                        <p className="text-xs text-zinc-500 tracking-[0.2em] mb-3">{m.label}</p>
                        <p className="text-3xl font-black text-white mb-1">{m.value}</p>
                        <p className="text-xs text-zinc-600">{m.sub}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
