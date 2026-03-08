// =========================================================
// ROUTE: /products/[slug] — Product Detail (Server Component + ISR)
// =========================================================
// Dynamic product page. Server-rendered with ISR caching.
// Returns 404 if product not found.
// =========================================================

import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/api/server-fetch';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { Product } from '@/types/api.types';
import ProductDetail from '@/components/product/product-detail';

export const revalidate = 300;

async function getProduct(slug: string): Promise<Product | null> {
    try {
        return await serverFetch<Product>(API_ENDPOINTS.products.detail(slug));
    } catch {
        return null;
    }
}

async function getProducts(): Promise<Product[]> {
    try {
        return await serverFetch<Product[]>(API_ENDPOINTS.products.list);
    } catch {
        return [];
    }
}

export async function generateStaticParams() {
    const products = await getProducts();
    return products.map((product) => ({
        slug: product.slug,
    }));
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const product = await getProduct(slug);

    if (!product) {
        notFound();
    }

    return <ProductDetail product={product} />;
}
