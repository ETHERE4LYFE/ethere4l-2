'use client';

// =========================================================
// LAYOUT: Admin — Role Guard + Sidebar Shell
// =========================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { LayoutDashboard, Package, ShoppingCart, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: user, isLoading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'ADMIN')) {
            router.replace('/');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-zinc-500 text-sm tracking-widest">LOADING...</div>
            </div>
        );
    }

    if (!user || user.role !== 'ADMIN') {
        return null;
    }

    return (
        <div className="min-h-screen bg-black flex">
            {/* Sidebar */}
            <aside className="w-56 border-r border-white/5 bg-zinc-950 flex flex-col py-6">
                <div className="px-5 mb-8">
                    <h2 className="text-xs font-bold text-zinc-500 tracking-[0.3em]">ADMIN PANEL</h2>
                </div>
                <nav className="flex-1 space-y-1 px-3">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <item.icon size={16} />
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="px-5 mt-auto">
                    <p className="text-xs text-zinc-600 truncate">{user.email}</p>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}
