'use client';

// =========================================================
// COMPONENT: Cart Item (Cart Drawer Row)
// =========================================================
// Renders a single cart item with quantity controls.
// Subscribes to store actions only — not full state.
// =========================================================

import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore, type CartItem as CartItemType } from '@/store/cart.store';

export default function CartItem({ item }: { item: CartItemType }) {
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const removeItem = useCartStore((state) => state.removeItem);

    function handleDecrease() {
        if (item.quantity === 1) {
            removeItem(item.id);
        } else {
            updateQuantity(item.id, item.quantity - 1);
        }
    }

    function handleIncrease() {
        updateQuantity(item.id, item.quantity + 1);
    }

    return (
        <div className="flex gap-3 py-4 border-b border-white/10">
            {item.image && (
                <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-zinc-800">
                    <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                    />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{item.name}</p>
                <p className="text-zinc-400 text-sm">${item.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-2">
                    <button
                        onClick={handleDecrease}
                        className="p-1 text-zinc-400 hover:text-white transition-colors"
                        aria-label={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                    >
                        {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                    </button>
                    <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                    <button
                        onClick={handleIncrease}
                        className="p-1 text-zinc-400 hover:text-white transition-colors"
                        aria-label="Increase quantity"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
