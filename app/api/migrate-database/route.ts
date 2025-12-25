// API endpoint to run database migrations in production
// Visit: https://your-app.onrender.com/api/migrate-database?secret=your-secret-key
// This will add missing columns to the database

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Simple security check - use environment variable
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    // Check secret key (you can set this in Render environment variables)
    const MIGRATION_SECRET = process.env.MIGRATION_SECRET || "migrate-db-2024";

    if (secret !== MIGRATION_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid secret key" },
        { status: 401 }
      );
    }

    console.log("🔄 Running database migrations...");
    const results = [];

    // Add isPriority column to Message table
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Message" 
        ADD COLUMN IF NOT EXISTS "isPriority" BOOLEAN NOT NULL DEFAULT false;
      `);
      results.push("✅ Added isPriority column to Message table");
    } catch (e: any) {
      results.push(`⚠️ isPriority: ${e.message}`);
    }

    // Add hasMentions column to Message table
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Message" 
        ADD COLUMN IF NOT EXISTS "hasMentions" BOOLEAN NOT NULL DEFAULT false;
      `);
      results.push("✅ Added hasMentions column to Message table");
    } catch (e: any) {
      results.push(`⚠️ hasMentions: ${e.message}`);
    }

    // Create Mention table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Mention" (
          "id" TEXT NOT NULL,
          "messageId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
        );
      `);
      results.push("✅ Created Mention table");
    } catch (e: any) {
      results.push(`⚠️ Mention table: ${e.message}`);
    }

    // Add indexes
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Mention_messageId_idx" ON "Mention"("messageId");
      `);
      results.push("✅ Created index on Mention.messageId");
    } catch (e: any) {
      results.push(`⚠️ Index messageId: ${e.message}`);
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Mention_userId_idx" ON "Mention"("userId");
      `);
      results.push("✅ Created index on Mention.userId");
    } catch (e: any) {
      results.push(`⚠️ Index userId: ${e.message}`);
    }

    // Add foreign keys
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'Mention_messageId_fkey'
          ) THEN
            ALTER TABLE "Mention" 
            ADD CONSTRAINT "Mention_messageId_fkey" 
            FOREIGN KEY ("messageId") REFERENCES "Message"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      results.push("✅ Added foreign key for Mention.messageId");
    } catch (e: any) {
      results.push(`⚠️ FK messageId: ${e.message}`);
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'Mention_userId_fkey'
          ) THEN
            ALTER TABLE "Mention" 
            ADD CONSTRAINT "Mention_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
      results.push("✅ Added foreign key for Mention.userId");
    } catch (e: any) {
      results.push(`⚠️ FK userId: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "Database migration completed!",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
