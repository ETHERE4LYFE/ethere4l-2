'use client';

// =========================================================
// PAGE: /admin/products — Product Management
// =========================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/api-client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { AdminProduct } from '@/types/api.types';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

// ---------------------------------------------------------
// Validation
// ---------------------------------------------------------
const productSchema = z.object({
    id: z.string().min(1, 'ID is required'),
    nombre: z.string().min(1, 'Name is required'),
    precio: z.coerce.number().positive('Price must be positive'),
    talla: z.string().optional(),
    imagen: z.string().optional(),
    stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
    descripcion: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

// ---------------------------------------------------------
// Component
// ---------------------------------------------------------
export default function AdminProductsPage() {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'products'],
        queryFn: () => apiGet<{ products: AdminProduct[] }>(API_ENDPOINTS.admin.products),
        retry: false,
    });

    const createMutation = useMutation({
        mutationFn: (body: ProductForm) => apiPost(API_ENDPOINTS.admin.products, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            setShowCreate(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...body }: ProductForm) =>
            apiPatch(API_ENDPOINTS.admin.productById(id), body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
            setEditingId(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiDelete(API_ENDPOINTS.admin.productById(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        },
    });

    const products = data?.products ?? [];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white tracking-widest">PRODUCTS</h1>
                <button
                    onClick={() => { setShowCreate(true); setEditingId(null); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
                >
                    <Plus size={14} /> Add Product
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <ProductFormCard
                    title="NEW PRODUCT"
                    onSubmit={(d) => createMutation.mutate(d)}
                    onCancel={() => setShowCreate(false)}
                    isPending={createMutation.isPending}
                    error={createMutation.error?.message}
                    showId
                />
            )}

            {isLoading ? (
                <p className="text-zinc-500 text-sm">Loading products...</p>
            ) : (
                <div className="space-y-2">
                    {products.map((p) => (
                        <div key={p.id}>
                            {editingId === p.id ? (
                                <ProductFormCard
                                    title="EDIT PRODUCT"
                                    defaultValues={{
                                        id: p.id,
                                        nombre: p.nombre,
                                        precio: p.precio,
                                        talla: p.talla ?? '',
                                        imagen: p.imagen ?? '',
                                        stock: p.stock,
                                        descripcion: p.descripcion ?? '',
                                    }}
                                    onSubmit={(d) => updateMutation.mutate(d)}
                                    onCancel={() => setEditingId(null)}
                                    isPending={updateMutation.isPending}
                                    error={updateMutation.error?.message}
                                />
                            ) : (
                                <div className="flex items-center justify-between bg-zinc-900 border border-white/5 rounded-lg px-4 py-3">
                                    <div className="flex items-center gap-4">
                                        {p.imagen && (
                                            <img src={p.imagen} alt={p.nombre} className="w-10 h-10 rounded object-cover" />
                                        )}
                                        <div>
                                            <p className="text-white text-sm font-medium">{p.nombre}</p>
                                            <p className="text-zinc-500 text-xs">{p.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-zinc-400 text-sm">${p.precio.toFixed(2)}</span>
                                        <span className="text-zinc-500 text-xs">Stock: {p.stock}</span>
                                        <button onClick={() => { setEditingId(p.id); setShowCreate(false); }} className="text-zinc-500 hover:text-white transition-colors">
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(p.id); }}
                                            className="text-zinc-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------
// Product Form Card
// ---------------------------------------------------------
function ProductFormCard({
    title,
    defaultValues,
    onSubmit,
    onCancel,
    isPending,
    error,
    showId,
}: {
    title: string;
    defaultValues?: Partial<ProductForm> | undefined;
    onSubmit: (data: ProductForm) => void;
    onCancel: () => void;
    isPending: boolean;
    error?: string | undefined;
    showId?: boolean | undefined;
}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { register, handleSubmit, formState: { errors } } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
        defaultValues,
    } as any);

    return (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-zinc-500 tracking-[0.2em]">{title}</h3>
                <button onClick={onCancel} className="text-zinc-500 hover:text-white"><X size={14} /></button>
            </div>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <form onSubmit={handleSubmit(onSubmit as any)} className="grid grid-cols-2 gap-3">
                {showId && (
                    <Field label="ID" error={errors.id?.message}>
                        <input {...register('id')} className="form-input" placeholder="product-id" />
                    </Field>
                )}
                {!showId && <input type="hidden" {...register('id')} />}
                <Field label="Name" error={errors.nombre?.message}>
                    <input {...register('nombre')} className="form-input" placeholder="Product name" />
                </Field>
                <Field label="Price" error={errors.precio?.message}>
                    <input {...register('precio')} type="number" step="0.01" className="form-input" placeholder="0.00" />
                </Field>
                <Field label="Stock" error={errors.stock?.message}>
                    <input {...register('stock')} type="number" className="form-input" placeholder="0" />
                </Field>
                <Field label="Size" error={errors.talla?.message}>
                    <input {...register('talla')} className="form-input" placeholder="S/M/L" />
                </Field>
                <Field label="Image URL" error={errors.imagen?.message}>
                    <input {...register('imagen')} className="form-input" placeholder="https://..." />
                </Field>
                <div className="col-span-2">
                    <Field label="Description" error={errors.descripcion?.message}>
                        <input {...register('descripcion')} className="form-input" placeholder="Description" />
                    </Field>
                </div>
                <div className="col-span-2">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:bg-white/10 disabled:text-zinc-500"
                    >
                        {isPending ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-zinc-400 text-xs mb-1">{label}</label>
            {children}
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            <style jsx global>{`
        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: #0a0a0a;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          color: white;
          font-size: 0.875rem;
        }
        .form-input:focus {
          outline: none;
          border-color: rgba(255,255,255,0.3);
        }
      `}</style>
        </div>
    );
}
