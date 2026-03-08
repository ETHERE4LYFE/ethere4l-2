// =========================================================
// COMPONENT: Product Detail (Server Component)
// =========================================================
// Renders product information on the server.
// Only the AddToCartButton hydrates client-side.
// =========================================================

import Image from 'next/image';
import type { Product } from '@/types/api.types';
import AddToCartButton from '@/components/cart/add-to-cart-button';

export default function ProductDetail({ product }: { product: Product }) {
    return (
        <div>
            <Image src={product.image} alt={product.name} width={400} height={400} />
            <h1>{product.name}</h1>
            <p>${product.price.toFixed(2)}</p>
            <AddToCartButton product={product} />
        </div>
    );
}
