const { PrismaClient } = require('@prisma/client');

// Use the environment variable for connection, but ensure we connect to the right host in local dev vs docker
// Since we mapped 5433 to 5432 on localhost, Prisma migrate works from the host
// But the app itself running on the host needs localhost:5433
const ensureLocalUrl = () => {
    let url = process.env.DATABASE_URL || "postgresql://ethere4l:strongpassword@localhost:5433/ethere4l_db";
    // If the app is running on the host (not inside docker container with link to 'postgres'),
    // we need to replace 'postgres:5432' with 'localhost:5433' or use the local url directly.
    if (url.includes('postgres:5432') && process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
        url = url.replace('postgres:5432', 'localhost:5433');
    }
    return url;
};

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: ensureLocalUrl()
        }
    }
});

// Test connection
prisma.$connect()
    .then(() => console.log('✅ Prisma conectado a PostgreSQL'))
    .catch(err => console.error('❌ Error conectando Prisma a PostgreSQL:', err));

module.exports = prisma;
