const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    // Create MessageReaction table using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "MessageReaction" (
        "id" TEXT NOT NULL,
        "emoji" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "messageId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        
        CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    // Create unique constraint
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "MessageReaction_messageId_userId_emoji_key" 
      ON "MessageReaction"("messageId", "userId", "emoji");
    `;

    // Create index for messageId
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "MessageReaction_messageId_idx" 
      ON "MessageReaction"("messageId");
    `;

    console.log("✅ MessageReaction table created successfully!");
  } catch (error) {
    console.error("Error creating MessageReaction table:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
