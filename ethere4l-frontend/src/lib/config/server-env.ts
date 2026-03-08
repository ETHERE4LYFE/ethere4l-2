// =========================================================
// CONFIG: Server-Only Environment Validation
// =========================================================
// Validates private environment variables (no NEXT_PUBLIC_ prefix).
// These are NEVER available in the client bundle.
//
// DO NOT import this module from client components.
// Only use from Server Components, Route Handlers, and
// server-side utilities like server-fetch.ts.
// =========================================================

import { z } from 'zod';

const privateSchema = z.object({
    INTERNAL_API_ORIGIN: z
        .string()
        .refine((val) => val.startsWith('http'), {
            message: "INTERNAL_API_ORIGIN must be a valid HTTP origin (e.g., 'http://backend:8080').",
        }),
});

function validateServerEnv() {
    const parsed = privateSchema.safeParse({
        INTERNAL_API_ORIGIN: process.env.INTERNAL_API_ORIGIN,
    });

    if (!parsed.success) {
        const formatted = parsed.error.issues
            .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(
            `\n❌ FATAL SERVER ENVIRONMENT VALIDATION FAILURE:\n${formatted}\n\nServer cannot start with invalid environment.\n`
        );
    }

    return parsed.data as z.infer<typeof privateSchema>;
}

export const serverEnv = validateServerEnv();
