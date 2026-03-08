// =========================================================
// MIDDLEWARE: validate(schema) — Zod validation middleware
// =========================================================

function validate(schema, source = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            return res.status(400).json({
                error: "Invalid request payload",
                details: result.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
        }

        // Attach sanitized data WITHOUT mutating original request
        if (source === 'body') {
            req.validatedBody = result.data;
        } else if (source === 'params') {
            req.validatedParams = result.data;
        } else if (source === 'query') {
            req.validatedQuery = result.data;
        }

        return next();
    };
}

module.exports = { validate };
