// =========================================================
// SCRIPT: Force-Seed ADMIN User (Raw SQL bypass)
// =========================================================
// Uses $executeRawUnsafe to bypass Prisma client type cache.
// Usage: npm run seed-admin
// =========================================================

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'ethere4lyfe@gmail.com';
const ADMIN_PASSWORD = 'EtherealAdmin2026!';
const ADMIN_NAME = 'Admin Ethere4l';

async function main() {
    console.log(`🔧 Seeding admin user: ${ADMIN_EMAIL}`);

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Check if user exists
    const existing = await prisma.$queryRaw`
        SELECT id, email, role FROM "User" WHERE email = ${ADMIN_EMAIL}
    `;

    if (existing.length > 0) {
        // Update existing user
        await prisma.$executeRaw`
            UPDATE "User"
            SET role = 'ADMIN', password = ${hashedPassword}, nombre = ${ADMIN_NAME}, "updatedAt" = NOW()
            WHERE email = ${ADMIN_EMAIL}
        `;
        console.log(`✅ Existing user updated to ADMIN.`);
        console.log(`   ID:    ${existing[0].id}`);
        console.log(`   Email: ${existing[0].email}`);
        console.log(`   Role:  ADMIN`);
    } else {
        // Create new user
        const id = randomUUID();
        await prisma.$executeRaw`
            INSERT INTO "User" (id, email, password, nombre, role, "createdAt", "updatedAt")
            VALUES (${id}, ${ADMIN_EMAIL}, ${hashedPassword}, ${ADMIN_NAME}, 'ADMIN', NOW(), NOW())
        `;
        console.log(`✅ Admin user created.`);
        console.log(`   ID:    ${id}`);
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Role:  ADMIN`);
    }

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('❌ Seed failed:', e.message);
    await prisma.$disconnect();
    process.exit(1);
});
