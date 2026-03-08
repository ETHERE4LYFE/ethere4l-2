// =========================================================
// SCRIPT: Post-Deploy Smoke Tests (Phase 21B)
// =========================================================
// Validates frontend/backend connectivity, session cookies,
// Stripe checkout initialization, and admin RBAC.
//
// Usage: node scripts/postDeployTest.js
// =========================================================

const https = require('https');

const API_URL = 'https://api-ethere4l.railway.app';
const TEST_EMAIL = 'test_smoke_' + Date.now() + '@example.com';
const TEST_PASSWORD = 'TestPassword123!';

// Simple request wrapper
function request(method, path, body = null, cookieUrl = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (cookieUrl) {
            options.headers['Cookie'] = cookieUrl;
        }

        const req = https.request(`${API_URL}${path}`, options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                let parsedData = null;
                if (data) {
                    try {
                        parsedData = JSON.parse(data);
                    } catch (e) {
                        parsedData = data; // Keep as string if it's not JSON
                    }
                }
                const response = {
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsedData,
                };
                resolve(response);
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function extractCookie(headers) {
    const setCookie = headers['set-cookie'];
    if (!setCookie) return null;
    // Just grab the first cookie for auth testing (ethere4l_access)
    return setCookie.find(c => c.startsWith('ethere4l_access')).split(';')[0];
}

async function runTests() {
    console.log('🚀 Starting ETHERE4L Post-Deploy Smoke Tests...');
    let hasFailures = false;
    let authCookie = null;

    try {
        // ---------------------------------------------------------
        // TEST 1 — API Connectivity (Liveness)
        // ---------------------------------------------------------
        process.stdout.write('Test 1 — API Connectivity... ');
        const t1 = await request('GET', '/health/live');
        if (t1.status === 200 && t1.data?.status === 'online') {
            console.log('✅ PASS');
        } else {
            console.log(`❌ FAIL (Status: ${t1.status})`);
            hasFailures = true;
        }

        // ---------------------------------------------------------
        // TEST 2 — Pre-Login Session Status (Expected 401)
        // ---------------------------------------------------------
        process.stdout.write('Test 2 — Session Endpoint (Unauthenticated)... ');
        const t2 = await request('GET', '/api/auth/me');
        if (t2.status === 401) {
            console.log('✅ PASS (Returns 401 as expected)');
        } else {
            console.log(`❌ FAIL (Expected 401, got ${t2.status})`);
            hasFailures = true;
        }

        // ---------------------------------------------------------
        // TEST 3 — Registration & Login Flow (Cross-domain cookies)
        // ---------------------------------------------------------
        process.stdout.write('Test 3 — Registration & Login Session Setup... ');
        // Register first
        await request('POST', '/api/auth/register', {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
        });

        // Then Login
        const t3 = await request('POST', '/api/auth/login', {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
        });

        authCookie = extractCookie(t3.headers);
        if (t3.status === 200 && authCookie) {
            console.log('✅ PASS (HttpOnly Cookie Received)');
        } else {
            console.log(`❌ FAIL (Status: ${t3.status}, Cookie: ${authCookie ? 'Yes' : 'No'})`);
            hasFailures = true;
        }

        // Verify session actually persists
        if (authCookie && !hasFailures) {
            process.stdout.write('   ↳ Verifying Session Persistence... ');
            const t3b = await request('GET', '/api/auth/me', null, authCookie);
            if (t3b.status === 200 && t3b.data?.data?.email === TEST_EMAIL) {
                console.log('✅ PASS');
            } else {
                console.log(`❌ FAIL (Status: ${t3b.status})`);
                hasFailures = true;
            }
        }

        // ---------------------------------------------------------
        // TEST 4 — Stripe Checkout Session Creation
        // ---------------------------------------------------------
        // Note: This might fail 404/400 if product doesn't exist. We just check if API is reachable.
        process.stdout.write('Test 4 — Checkout Session Architecture... ');
        const t4 = await request('POST', '/api/create-checkout-session', {
            items: [{ id: 'test_id', quantity: 1 }]
        }, authCookie); // Might not need auth, but we send it anyway

        // We expect either 200 (url returned) or 400/404 (product not found validation in backend).
        // The critical failure is 5xx or CORS.
        if (t4.status === 200 && t4.data?.data?.url) {
            console.log('✅ PASS (URL Returned)');
        } else if (t4.status === 400 || t4.status === 404) {
            console.log(`✅ PASS (Validation working, Status: ${t4.status})`);
        } else {
            console.log(`❌ FAIL (Status: ${t4.status})`);
            hasFailures = true;
        }

        // ---------------------------------------------------------
        // TEST 5 — Admin RBAC Protection
        // ---------------------------------------------------------
        process.stdout.write('Test 5 — Admin Route Protection... ');
        // The user we created is a CUSTOMER, not ADMIN. Expect 403.
        const t5 = await request('GET', '/api/admin/rbac/products', null, authCookie);
        if (t5.status === 403) {
            console.log('✅ PASS (RBAC Enforced — 403 Forbidden)');
        } else {
            console.log(`❌ FAIL (Expected 403, got ${t5.status})`);
            hasFailures = true;
        }

    } catch (error) {
        console.log(`❌ FATAL ERROR: ${error.message}`);
        hasFailures = true;
    }

    console.log('\n=======================================');
    if (hasFailures) {
        console.log('❌ DEPLOYMENT FAILURE CONDITIONS MET ❌');
        console.log('Cross-domain config or infrastructure is incorrect.');
        process.exit(1);
    } else {
        console.log('✅ ALL TESTS PASSED SUCCESSFULLY ✅');
        console.log('Infrastructure is ready for Soft Launch.');
        process.exit(0);
    }
}

runTests();
