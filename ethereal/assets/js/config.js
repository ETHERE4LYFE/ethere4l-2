// =========================================================
// ETHERE4L FRONTEND CONFIG — SINGLE SOURCE OF TRUTH
// =========================================================
// All frontend files MUST load this before any fetch().
// When Railway changes domain or you migrate,
// change ONLY this file.
// =========================================================
// FIX APPLIED:
//   ✅ Added API_TIMEOUT for mobile resilience
//   ✅ Added isProduction flag for conditional logic
//   ✅ Structure preserved 1:1
// =========================================================

(function() {
    'use strict';

    var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    window.ETHERE4L_CONFIG = {
        API_BASE: isLocal
            ? 'http://localhost:3000'
            : 'https://api.ethere4l.com',

        // ✅ NEW: Timeout for mobile networks (slow 3G/4G)
        API_TIMEOUT: 15000,

        // ✅ NEW: Environment flag
        IS_PRODUCTION: !isLocal
    };

    // ✅ NEW: Freeze to prevent accidental mutation
    Object.freeze(window.ETHERE4L_CONFIG);

})();