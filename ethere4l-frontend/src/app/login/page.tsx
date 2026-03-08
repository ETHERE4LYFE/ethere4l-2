'use client';

// =========================================================
// PAGE: /login — User Login
// =========================================================

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validation/authSchemas';
import { useLogin } from '@/hooks/mutations/useAuth';
import type { NormalizedError } from '@/lib/api/error-normalizer';

export default function LoginPage() {
    const router = useRouter();
    const loginMutation = useLogin();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    function onSubmit(data: LoginFormData) {
        loginMutation.mutate(data, {
            onSuccess: () => {
                router.push('/orders');
            },
        });
    }

    const apiError = loginMutation.error as unknown as NormalizedError | undefined;

    return (
        <main className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <h1 className="text-3xl font-black text-white tracking-widest text-center mb-8">
                    LOGIN
                </h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* API Error */}
                    {apiError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                            {apiError.message || 'Authentication failed'}
                        </div>
                    )}

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-zinc-400 text-sm mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            {...register('email')}
                            className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="you@example.com"
                        />
                        {errors.email && (
                            <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-zinc-400 text-sm mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            {...register('password')}
                            className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="••••••••"
                        />
                        {errors.password && (
                            <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:bg-white/10 disabled:text-zinc-500 disabled:cursor-not-allowed"
                    >
                        {loginMutation.isPending ? 'Signing in...' : 'SIGN IN'}
                    </button>
                </form>

                <p className="text-zinc-500 text-sm text-center mt-6">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="text-white hover:underline">
                        Register
                    </Link>
                </p>
            </div>
        </main>
    );
}
