'use client';

// =========================================================
// COMPONENT: Cart Drawer (Slide-out Panel + Stripe Checkout)
// =========================================================
// SSR-safe: uses useSyncExternalStore for hydration guard.
// Fixed overlay + sliding right panel.
// Checkout redirects to Stripe Hosted Checkout via backend.
// =========================================================

import { useState, useSyncExternalStore, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCartStore, useCartTotalPrice } from '@/store/cart.store';
import apiClient from '@/lib/api/axios';
import CartItem from './cart-item';

const emptySubscribe = () => () => { };

export default function CartDrawer() {
    const isClient = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );
    const isOpen = useCartStore((state) => state.isOpen);
    const items = useCartStore((state) => state.items);
    const setIsOpen = useCartStore((state) => state.setIsOpen);
    const totalPrice = useCartTotalPrice();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Rehydrate persist on first client render
    if (isClient && !useCartStore.persist.hasHydrated()) {
        useCartStore.persist.rehydrate();
    }

    const handleCheckout = useCallback(async () => {
        if (items.length === 0 || isCheckingOut) return;

        setIsCheckingOut(true);
        try {
            const response = await apiClient.post<{ url: string }>('/create-checkout-session', {
                items: items.map((item) => ({
                    id: item.id,
                    quantity: item.quantity,
                })),
            });

            if (response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (error) {
            console.error('Checkout failed:', error);
            setIsCheckingOut(false);
        }
    }, [items, isCheckingOut]);

    if (!isClient) return null;
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            {/* Panel */}
            <div className="absolute right-0 top-0 h-full w-full md:w-96 bg-zinc-950 border-l border-white/10 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
                    <h2 className="text-white text-lg font-semibold">Cart</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
                        aria-label="Close cart"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-4">
                    {items.length === 0 ? (
                        <p className="text-zinc-500 text-center py-12">Your cart is empty</p>
                    ) : (
                        items.map((item) => <CartItem key={item.id} item={item} />)
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-white/10 px-4 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400 text-sm">Total</span>
                            <span className="text-white text-lg font-semibold">
                                ${totalPrice.toFixed(2)}
                            </span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={isCheckingOut || items.length === 0}
                            className="w-full py-3 bg-white text-black rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:bg-white/10 disabled:text-zinc-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isCheckingOut ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'CHECKOUT'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
