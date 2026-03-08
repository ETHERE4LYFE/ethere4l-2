'use client';

// =========================================================
// PAGE: /checkout/success — Payment Confirmation
// =========================================================
// Clears cart on mount. Does NOT create orders — that's
// handled by the backend Stripe webhook.
// =========================================================

import { useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cart.store';

export default function CheckoutSuccessPage() {
    const clearCart = useCartStore((state) => state.clearCart);

    useEffect(() => {
        clearCart();
    }, [clearCart]);

    return (
        <main className="max-w-2xl mx-auto px-4 py-24 text-center">
            <h1 className="text-4xl font-black text-white tracking-widest mb-4">
                PAYMENT SUCCESSFUL
            </h1>
            <p className="text-zinc-400 mb-12">
                Your order has been confirmed. You will receive a confirmation email shortly.
            </p>
            <Link
                href="/orders"
                className="inline-block px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors tracking-wider"
            >
                VIEW MY ORDERS
            </Link>
        </main>
    );
}
