// =========================================================
// MIDDLEWARE: Webhook Replay Protection
// =========================================================
// Rejects duplicate Stripe event IDs to prevent replay attacks.
// Stores last N event IDs in a circular buffer.
// =========================================================

const MAX_EVENTS = 1000;
const seenEvents = new Set();
const eventQueue = [];

function webhookReplayGuard(req, res, next) {
    // Event ID is parsed from the body after Stripe verification in the controller.
    // This middleware sets up a hook that the controller can call.
    req.checkReplay = function (eventId) {
        if (seenEvents.has(eventId)) {
            return true; // Is a replay
        }

        // Add to seen events (circular buffer)
        seenEvents.add(eventId);
        eventQueue.push(eventId);

        // Evict oldest if over capacity
        while (eventQueue.length > MAX_EVENTS) {
            const oldest = eventQueue.shift();
            seenEvents.delete(oldest);
        }

        return false; // Not a replay
    };

    next();
}

module.exports = { webhookReplayGuard };
