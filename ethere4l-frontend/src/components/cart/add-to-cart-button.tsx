'use client';

// =========================================================
// COMPONENT: Add to Cart Button (Client Component)
// =========================================================
// Isolated client interaction layer.
// Triggers Zustand cart mutation only — no API calls.
// =========================================================

import { useCartStore } from '@/store/cart.store';
import type { Product } from '@/types/api.types';

export default function AddToCartButton({ product }: { product: Product }) {
    const addItem = useCartStore((state) => state.addItem);

    function handleAddToCart() {
        addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            slug: product.slug,
            image: product.image,
            quantity: 1,
        });
    }

    return (
        <button onClick={handleAddToCart}>
            Add to Cart
        </button>
    );
}
