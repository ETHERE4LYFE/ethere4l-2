const http = require('http');

const payloads = [
    { name: "Case 1: {}", body: {} },
    { name: "Case 2: {items: null}", body: { items: null } },
    { name: "Case 3: {items: []}", body: { items: [] } },
    { name: "Case 4: {items: 'not-an-array'}", body: { items: "not-an-array" } },
    { name: "Case 5: {items: [{productId: 'abc'}]}", body: { items: [{ productId: "abc" }] } },
    { name: "Case 6: {fake: 'data'}", body: { fake: "data" } }
];

async function runTest() {
    for (const test of payloads) {
        await new Promise(resolve => {
            const req = http.request({
                hostname: 'localhost',
                port: 8080,
                path: '/api/create-checkout-session',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`\n--- ${test.name} ---`);
                    console.log(`Status Code: ${res.statusCode}`);
                    console.log(`Response: ${data}`);
                    resolve();
                });
            });
            req.on('error', e => {
                console.error(`Request error: ${e.message}`);
                resolve();
            });
            req.write(JSON.stringify(test.body));
            req.end();
        });
    }
}

runTest();
