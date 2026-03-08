'use client';

// =========================================================
// PAGE: /orders — Customer Orders List
// =========================================================

import Link from 'next/link';
import { useOrders } from '@/hooks/queries/useOrders';

export default function OrdersPage() {
    const { data, isLoading, isError } = useOrders();

    if (isLoading) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-2xl font-bold text-white mb-8">MY ORDERS</h1>
                <p className="text-zinc-500">Loading orders...</p>
            </main>
        );
    }

    if (isError) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-2xl font-bold text-white mb-8">MY ORDERS</h1>
                <p className="text-zinc-400">Unable to load orders. Please log in and try again.</p>
            </main>
        );
    }

    const orders = data?.orders ?? [];

    return (
        <main className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-2xl font-bold text-white mb-8 tracking-widest">MY ORDERS</h1>

            {orders.length === 0 ? (
                <p className="text-zinc-500">No orders yet.</p>
            ) : (
                <div className="border border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="text-left text-zinc-400 text-xs font-medium px-4 py-3 uppercase tracking-wider">Order</th>
                                <th className="text-left text-zinc-400 text-xs font-medium px-4 py-3 uppercase tracking-wider">Date</th>
                                <th className="text-left text-zinc-400 text-xs font-medium px-4 py-3 uppercase tracking-wider">Status</th>
                                <th className="text-right text-zinc-400 text-xs font-medium px-4 py-3 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-4">
                                        <Link
                                            href={`/orders/${order.id}`}
                                            className="text-white font-mono text-sm hover:underline"
                                        >
                                            {order.id.slice(0, 8)}...
                                        </Link>
                                    </td>
                                    <td className="px-4 py-4 text-zinc-400 text-sm">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-white/10 text-zinc-300">
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right text-white font-mono text-sm">
                                        ${order.totalAmount.toFixed(2)} {order.currency.toUpperCase()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
