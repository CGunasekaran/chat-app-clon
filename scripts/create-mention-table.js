const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Creating Mention table...");

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Mention" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "startIndex" INTEGER NOT NULL,
        "length" INTEGER NOT NULL,
        "isAll" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "messageId" TEXT NOT NULL,
        "userId" TEXT,
        CONSTRAINT "Mention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Mention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `;

    console.log("Creating indexes on Mention table...");

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Mention_messageId_idx" ON "Mention"("messageId")
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Mention_userId_idx" ON "Mention"("userId")
    `;

    console.log("Adding mention fields to Message table...");

    // Add isPriority field
    await prisma.$executeRaw`
      ALTER TABLE "Message" 
      ADD COLUMN IF NOT EXISTS "isPriority" BOOLEAN NOT NULL DEFAULT false
    `;

    // Add hasMentions field
    await prisma.$executeRaw`
      ALTER TABLE "Message" 
      ADD COLUMN IF NOT EXISTS "hasMentions" BOOLEAN NOT NULL DEFAULT false
    `;

    console.log("✅ Mention table and indexes created successfully!");
  } catch (error) {
    console.error("Error creating Mention table:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
