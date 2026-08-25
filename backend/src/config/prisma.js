require('dotenv').config();

const {
  Pool
} = require('pg');

const {
  PrismaPg
} = require('@prisma/adapter-pg');

const {
  PrismaClient
} = require('@prisma/client');

const connectionString =
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is missing from backend/.env'
  );
}

const pool = new Pool({
  connectionString
});

const adapter =
  new PrismaPg(pool);

const prisma =
  new PrismaClient({
    adapter
  });

async function connectDatabase() {
  try {
    await prisma.$connect();

    await prisma.$queryRaw`
      SELECT 1
    `;

    console.log(
      'PostgreSQL connected successfully'
    );
  } catch (error) {
    console.error(
      'PostgreSQL connection failed:',
      error.message
    );

    throw error;
  }
}

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    await pool.end();

    console.log(
      'PostgreSQL connection closed successfully'
    );
  } catch (error) {
    console.error(
      'PostgreSQL disconnection failed:',
      error.message
    );

    throw error;
  }
}

module.exports = {
  prisma,
  pool,
  connectDatabase,
  disconnectDatabase
};