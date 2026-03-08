'use client';

// =========================================================
// PAGE: /orders/[orderId] — Order Detail
// =========================================================

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useOrder } from '@/hooks/queries/useOrders';

export default function OrderDetailPage({
    params,
}: {
    params: Promise<{ orderId: string }>;
}) {
    const { orderId } = use(params);
    const { data: order, isLoading, isError } = useOrder(orderId);

    if (isLoading) {
        return (
            <main className="max-w-3xl mx-auto px-4 py-12">
                <p className="text-zinc-500">Loading order...</p>
            </main>
        );
    }

    if (isError || !order) {
        return (
            <main className="max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-2xl font-bold text-white mb-4">Order Not Found</h1>
                <p className="text-zinc-400 mb-6">This order does not exist or you do not have access.</p>
                <Link href="/orders" className="text-white underline hover:text-zinc-300">
                    ← Back to Orders
                </Link>
            </main>
        );
    }

    return (
        <main className="max-w-3xl mx-auto px-4 py-12">
            <Link href="/orders" className="text-zinc-400 text-sm hover:text-white mb-6 inline-block">
                ← Back to Orders
            </Link>

            <h1 className="text-2xl font-bold text-white mb-2 tracking-widest">ORDER DETAIL</h1>

            <div className="border border-white/10 rounded-lg p-6 mb-8 space-y-2">
                <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Order ID</span>
                    <span className="text-white font-mono text-sm">{order.id}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Date</span>
                    <span className="text-white text-sm">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Status</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-white/10 text-zinc-300">{order.status}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Total</span>
                    <span className="text-white font-semibold">${order.totalAmount.toFixed(2)} {order.currency.toUpperCase()}</span>
                </div>
            </div>

            <h2 className="text-lg font-semibold text-white mb-4">Items</h2>
            <div className="space-y-4">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 border border-white/10 rounded-lg p-4">
                        {item.product.imageUrl && (
                            <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-zinc-800">
                                <Image
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{item.product.name}</p>
                            <p className="text-zinc-400 text-sm">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-white font-mono text-sm self-center">
                            ${item.price.toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
