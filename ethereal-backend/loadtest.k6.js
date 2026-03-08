import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 200 },  // Ramp up to 200 users over 2 minutes
        { duration: '5m', target: 1000 }, // Ramp up to 1000 users and hold for 5 minutes
        { duration: '3m', target: 0 },    // Ramp down to 0 users over 3 minutes
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],    // Error rate must be < 1%
        http_req_duration: ['p(95)<400'],  // 95% of requests must complete below 400ms
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-load-test': 'true' // Trigger Stripe bypass
        },
    };

    // 1. Get Catalog
    const catalogRes = http.get(`${BASE_URL}/api/productos`);
    check(catalogRes, {
        'catalog loaded': (r) => r.status === 200,
    });

    sleep(1);

    // 2. Simulate Cart Checkout
    const payload = JSON.stringify({
        customer: {
            nombre: "Load Test User",
            email: `loadtest-${__VU}-${__ITER}@example.com`,
            telefono: "5551234567"
        },
        items: [
            {
                id: "1", // Assuming a product ID 1 exists
                cantidad: 1,
                precio: 500
            }
        ]
    });

    const checkoutRes = http.post(`${BASE_URL}/api/create-checkout-session`, payload, params);

    check(checkoutRes, {
        'checkout successful': (r) => r.status === 200,
        'mock url returned': (r) => r.json('url') !== undefined && r.json('url').includes('mock_load_test'),
    });

    sleep(2);
}
