// =========================================================
// MIDDLEWARE: validate(schema) — Zod validation middleware
// =========================================================

const { ZodError } = require('zod');

/**
 * Creates Express middleware that validates req.body against a Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'params'|'query'} source - Request property to validate
 */
function validate(schema, source = 'body') {
    return (req, res, next) => {
        try {
            const data = schema.parse(req[source]);
            req[source] = data; // Replace with parsed/cleaned data
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const messages = err.errors.map(e => e.message).join(', ');
                return res.status(400).json({
                    error: messages,
                    details: err.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            next(err);
        }
    };
}

module.exports = { validate };
