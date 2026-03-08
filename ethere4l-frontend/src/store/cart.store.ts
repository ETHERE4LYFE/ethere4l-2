// =========================================================
// STORE: Shopping Cart (Zustand + Persist)
// =========================================================
// Client-side optimistic cart state.
// Persisted to localStorage via Zustand persist middleware.
// Final validation occurs at Checkout API (backend).
//
// IMMUTABILITY: All state updates return new arrays/objects.
// No direct mutation (no +=, no push, no splice).
//
// No network requests. No auth dependency.
// =========================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------
// TYPES
// ---------------------------------------------------------
export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    slug: string;
    image?: string;
}

interface CartState {
    items: CartItem[];
    isOpen: boolean;

    // Actions
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    setIsOpen: (isOpen: boolean) => void;
}

// ---------------------------------------------------------
// STORE (Persisted to localStorage as 'ethere4l-cart')
// ---------------------------------------------------------
export const useCartStore = create<CartState>()(
    persist(
        (set) => ({
            items: [],
            isOpen: false,

            addItem: (item) =>
                set((state) => {
                    const exists = state.items.find((i) => i.id === item.id);
                    if (exists) {
                        return {
                            items: state.items.map((i) =>
                                i.id === item.id
                                    ? { ...i, quantity: i.quantity + item.quantity }
                                    : i
                            ),
                            isOpen: true,
                        };
                    }
                    return {
                        items: [...state.items, item],
                        isOpen: true,
                    };
                }),

            removeItem: (id) =>
                set((state) => ({
                    items: state.items.filter((i) => i.id !== id),
                })),

            updateQuantity: (id, quantity) =>
                set((state) => {
                    if (quantity <= 0) {
                        return { items: state.items.filter((i) => i.id !== id) };
                    }
                    return {
                        items: state.items.map((i) =>
                            i.id === id ? { ...i, quantity } : i
                        ),
                    };
                }),

            clearCart: () => set({ items: [] }),

            setIsOpen: (isOpen) => set({ isOpen }),
        }),
        {
            name: 'ethere4l-cart',
            // SSR safety: persist middleware skips localStorage on server
            // and hydrates on client mount, preventing hydration mismatches.
            skipHydration: true,
        }
    )
);

// ---------------------------------------------------------
// DERIVED SELECTORS (Computed, not stored)
// ---------------------------------------------------------
export const useCartTotalItems = () =>
    useCartStore((state) =>
        state.items.reduce((sum, i) => sum + i.quantity, 0)
    );

export const useCartTotalPrice = () =>
    useCartStore((state) =>
        state.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    );
