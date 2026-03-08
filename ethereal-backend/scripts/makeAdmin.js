// =========================================================
// SCRIPT: Promote User to ADMIN
// =========================================================
// Usage: node scripts/makeAdmin.js admin@email.com
// =========================================================

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const prisma = require('../src/database/prismaClient');

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error('Usage: node scripts/makeAdmin.js <email>');
        process.exit(1);
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: { email: cleanEmail }
    });

    if (!user) {
        console.error(`User not found: ${cleanEmail}`);
        process.exit(1);
    }

    if (user.role === 'ADMIN') {
        console.log(`User ${cleanEmail} is already an ADMIN.`);
        process.exit(0);
    }

    await prisma.user.update({
        where: { email: cleanEmail },
        data: { role: 'ADMIN' }
    });

    console.log(`✅ User ${cleanEmail} promoted to ADMIN.`);
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
});
