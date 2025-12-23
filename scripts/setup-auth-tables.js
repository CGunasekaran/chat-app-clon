const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupAuthTables() {
  try {
    console.log('🔧 Setting up authentication tables...\n');

    // Create EmailVerification table
    console.log('Creating EmailVerification table...');
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
    console.log('✅ EmailVerification table created');

    // Create PasswordReset table
    console.log('\nCreating PasswordReset table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PasswordReset" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT NOT NULL,
        "token" TEXT UNIQUE NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "used" BOOLEAN NOT NULL DEFAULT false
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PasswordReset_email_idx" ON "PasswordReset"("email");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PasswordReset_token_idx" ON "PasswordReset"("token");
    `);
    console.log('✅ PasswordReset table created');

    console.log('\n🎉 All authentication tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAuthTables();
