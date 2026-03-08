'use client';

// =========================================================
// PAGE: /admin — Dashboard Overview
// =========================================================

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/api-client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { AdminAnalytics } from '@/types/api.types';
import { Package, ShoppingCart, Users, Activity } from 'lucide-react';

export default function AdminDashboardPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'analytics'],
        queryFn: () => apiGet<AdminAnalytics>(API_ENDPOINTS.admin.analytics),
        retry: false,
    });

    const cards = [
        { label: 'Total Revenue', value: data ? `$${data.totalRevenue.toFixed(2)}` : '—', icon: Activity, color: 'text-green-400' },
        { label: 'Total Orders', value: data?.totalOrders ?? '—', icon: ShoppingCart, color: 'text-blue-400' },
        { label: 'Products Sold', value: data?.productsSold ?? '—', icon: Package, color: 'text-purple-400' },
        { label: 'Customers', value: data?.totalCustomers ?? '—', icon: Users, color: 'text-amber-400' },
    ];

    return (
        <div>
            <h1 className="text-2xl font-black text-white tracking-widest mb-8">DASHBOARD</h1>

            {isLoading ? (
                <p className="text-zinc-500 text-sm">Loading analytics...</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards.map((card) => (
                        <div key={card.label} className="bg-zinc-900 border border-white/5 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <card.icon size={18} className={card.color} />
                                <span className="text-xs text-zinc-500 tracking-wider uppercase">{card.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{card.value}</p>
                        </div>
                    ))}

                    {/* Active Reservations */}
                    <div className="bg-zinc-900 border border-white/5 rounded-xl p-5 sm:col-span-2 lg:col-span-4">
                        <span className="text-xs text-zinc-500 tracking-wider uppercase">Active Reservations</span>
                        <p className="text-xl font-bold text-red-400 mt-2">{data?.activeReservations ?? '—'}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
