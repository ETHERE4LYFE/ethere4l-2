'use client';

// =========================================================
// PAGE: /register — User Registration
// =========================================================

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '@/lib/validation/authSchemas';
import { useRegister } from '@/hooks/mutations/useAuth';
import type { NormalizedError } from '@/lib/api/error-normalizer';

export default function RegisterPage() {
    const router = useRouter();
    const registerMutation = useRegister();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    function onSubmit(data: RegisterFormData) {
        registerMutation.mutate(
            { name: data.name, email: data.email, password: data.password },
            {
                onSuccess: () => {
                    router.push('/orders');
                },
            }
        );
    }

    const apiError = registerMutation.error as unknown as NormalizedError | undefined;

    return (
        <main className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <h1 className="text-3xl font-black text-white tracking-widest text-center mb-8">
                    REGISTER
                </h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* API Error */}
                    {apiError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                            {apiError.message || 'Registration failed'}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-zinc-400 text-sm mb-1">
                            Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            {...register('name')}
                            className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="Your name"
                        />
                        {errors.name && (
                            <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
                        )}
                    </div>

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
                            autoComplete="new-password"
                            {...register('password')}
                            className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="••••••••"
                        />
                        {errors.password && (
                            <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-zinc-400 text-sm mb-1">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            {...register('confirmPassword')}
                            className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="••••••••"
                        />
                        {errors.confirmPassword && (
                            <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:bg-white/10 disabled:text-zinc-500 disabled:cursor-not-allowed"
                    >
                        {registerMutation.isPending ? 'Creating account...' : 'CREATE ACCOUNT'}
                    </button>
                </form>

                <p className="text-zinc-500 text-sm text-center mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-white hover:underline">
                        Login
                    </Link>
                </p>
            </div>
        </main>
    );
}
