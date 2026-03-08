// =========================================================
// CONFIG: Environment Validation (Fail-Fast Bootstrap)
// =========================================================
// Validates required environment variables at import time.
// Application crashes immediately if misconfigured.
//
// This module validates PUBLIC vars only (NEXT_PUBLIC_*).
// Safe to import from both client and server code.
//
// For server-only vars, use @/lib/config/server-env.ts
// =========================================================

import { z } from 'zod';

const publicSchema = z.object({
    NEXT_PUBLIC_API_URL: z
        .string()
        .refine((val) => val === '/api', {
            message: "NEXT_PUBLIC_API_URL must be exactly '/api'. No external origins allowed.",
        }),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
});

function validatePublicEnv() {
    const parsed = publicSchema.safeParse({
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    });

    if (!parsed.success) {
        const formatted = parsed.error.issues
            .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(
            `\n❌ FATAL ENVIRONMENT VALIDATION FAILURE:\n${formatted}\n\nApplication cannot start with invalid environment.\n`
        );
    }

    return parsed.data as z.infer<typeof publicSchema>;
}

export const env = validatePublicEnv();
