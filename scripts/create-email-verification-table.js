const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createEmailVerificationTable() {
  try {
    // Create the EmailVerification table using raw SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EmailVerification" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT NOT NULL,
        "otp" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "verified" BOOLEAN NOT NULL DEFAULT false
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "EmailVerification_email_idx" ON "EmailVerification"("email");
    `);

    console.log('✅ EmailVerification table created successfully!');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createEmailVerificationTable();
