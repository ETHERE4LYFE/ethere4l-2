'use client';

// =========================================================
// PAGE: /admin/orders — Order Management
// =========================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/api-client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { AdminOrdersResponse, AdminOrder } from '@/types/api.types';

export default function AdminOrdersPage() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

    const queryString = `?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`;

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'orders', page, statusFilter],
        queryFn: () => apiGet<AdminOrdersResponse>(`${API_ENDPOINTS.admin.orders}${queryString}`),
        retry: false,
    });

    const orders = data?.orders ?? [];
    const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

    return (
        <div>
            <h1 className="text-2xl font-black text-white tracking-widest mb-6">ORDERS</h1>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-6">
                {['', 'PENDIENTE', 'PAGADO', 'EXPIRADO'].map((s) => (
                    <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setPage(1); }}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${statusFilter === s
                                ? 'bg-white text-black border-white'
                                : 'bg-transparent text-zinc-400 border-white/10 hover:border-white/30'
                            }`}
                    >
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <p className="text-zinc-500 text-sm">Loading orders...</p>
            ) : orders.length === 0 ? (
                <p className="text-zinc-500 text-sm">No orders found.</p>
            ) : (
                <>
                    <div className="space-y-2">
                        {orders.map((o) => (
                            <button
                                key={o.id}
                                onClick={() => setSelectedOrder(selectedOrder?.id === o.id ? null : o)}
                                className="w-full text-left bg-zinc-900 border border-white/5 rounded-lg px-4 py-3 hover:border-white/10 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-sm font-mono">{o.id.slice(0, 8)}...</p>
                                        <p className="text-zinc-500 text-xs">{o.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white text-sm">${o.total.toFixed(2)}</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded ${o.status === 'PAGADO' ? 'bg-green-500/10 text-green-400' :
                                                    o.status === 'EXPIRADO' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-yellow-500/10 text-yellow-400'
                                                }`}>
                                                {o.status}
                                            </span>
                                            <span className="text-zinc-600 text-xs">{new Date(o.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {selectedOrder?.id === o.id && (
                                    <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                                        {o.items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-xs">
                                                <span className="text-zinc-400">{item.productName} × {item.quantity}</span>
                                                <span className="text-zinc-500">${item.price.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs text-zinc-400 border border-white/10 rounded-lg disabled:opacity-30"
                            >
                                Prev
                            </button>
                            <span className="text-zinc-500 text-xs">Page {page} of {totalPages}</span>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-xs text-zinc-400 border border-white/10 rounded-lg disabled:opacity-30"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
