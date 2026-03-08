'use client';

// =========================================================
// COMPONENT: Cart Widget (Navbar Icon + Badge)
// =========================================================
// SSR-safe: renders badge only after hydration via
// useSyncExternalStore subscribe pattern.
// =========================================================

import { useCallback, useSyncExternalStore } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCartStore, useCartTotalItems } from '@/store/cart.store';

const emptySubscribe = () => () => { };

export default function CartWidget() {
    const isClient = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );
    const totalItems = useCartTotalItems();

    const handleOpen = useCallback(() => {
        useCartStore.getState().setIsOpen(true);
    }, []);

    // Rehydrate persist on first client render
    if (isClient && !useCartStore.persist.hasHydrated()) {
        useCartStore.persist.rehydrate();
    }

    return (
        <button
            onClick={handleOpen}
            className="relative p-2 text-white hover:text-zinc-300 transition-colors"
            aria-label="Open cart"
        >
            <ShoppingBag size={24} />
            {isClient && totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                </span>
            )}
        </button>
    );
}
