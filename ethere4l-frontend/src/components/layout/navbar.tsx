// =========================================================
// COMPONENT: Navbar (Server Component — Global Shell)
// =========================================================
// Sticky top header. Dark aesthetic.
// CartWidget hydrates client-side.
// =========================================================

import Link from 'next/link';
import CartWidget from '@/components/cart/cart-widget';

export default function Navbar() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
            <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="text-white text-xl font-bold tracking-widest">
                    ETHERE4L
                </Link>
                <CartWidget />
            </nav>
        </header>
    );
}
