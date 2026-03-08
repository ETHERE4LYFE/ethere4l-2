// =========================================================
// ROUTE: /products — Product Listing (Server Component + ISR)
// =========================================================
// Fully server-rendered. SEO-friendly HTML output.
// ISR: cached for 5 minutes, regenerated on next request.
// No client hooks. No Axios. Uses serverFetch bridge.
// =========================================================

import { serverFetch } from '@/lib/api/server-fetch';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { Product } from '@/types/api.types';

export const revalidate = 300;

async function getProducts(): Promise<Product[]> {
    return serverFetch<Product[]>(API_ENDPOINTS.products.list);
}

export default async function ProductsPage() {
    const products = await getProducts();

    return (
        <main>
            <h1>Products</h1>
            <div>
                {products.map((product) => (
                    <div key={product.id}>
                        <h2>{product.name}</h2>
                        <p>${product.price.toFixed(2)}</p>
                    </div>
                ))}
            </div>
        </main>
    );
}
