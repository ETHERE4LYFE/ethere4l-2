// =========================================================
// ETHERE4L FRONTEND CONFIG — SINGLE SOURCE OF TRUTH
// =========================================================
// All frontend files import API_BASE from here.
// When Railway changes domain or you migrate to api.ethere4l.com,
// change ONLY this file.
// =========================================================

(function() {
    'use strict';

    var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    window.ETHERE4L_CONFIG = {
        API_BASE: isLocal
            ? 'http://localhost:3000'
            :  "https://api.ethere4l.com"

    };
})();