// =========================================================
// COOKIE CONFIGURATION
// =========================================================
// Cookie options for HttpOnly session cookies.
// Safari iOS REQUIRES explicit domain for SameSite=None cookies.
// =========================================================

const { IS_PRODUCTION, COOKIE_DOMAIN } = require('./env');

const ACCESS_COOKIE_NAME = 'ethere4l_access';
const REFRESH_COOKIE_NAME = 'ethere4l_refresh';

function getSessionCookieOptions(maxAgeDays) {
    var options = {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: IS_PRODUCTION ? 'None' : 'Lax',
        path: '/',
        maxAge: maxAgeDays * 24 * 60 * 60 * 1000
    };

    if (IS_PRODUCTION && COOKIE_DOMAIN) {
        options.domain = COOKIE_DOMAIN;
    }

    return options;
}

function getClearCookieOptions() {
    var options = {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: IS_PRODUCTION ? 'None' : 'Lax',
        path: '/'
    };

    if (IS_PRODUCTION && COOKIE_DOMAIN) {
        options.domain = COOKIE_DOMAIN;
    }

    return options;
}

module.exports = {
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    getSessionCookieOptions,
    getClearCookieOptions
};
