const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Creating NotificationPreferences table...");

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "NotificationPreferences" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sound" TEXT NOT NULL DEFAULT 'default',
        "showPreview" BOOLEAN NOT NULL DEFAULT true,
        "isPriority" BOOLEAN NOT NULL DEFAULT false,
        "muteUntil" TIMESTAMP(3),
        "onlyMentions" BOOLEAN NOT NULL DEFAULT false,
        "bundleMessages" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "userId" TEXT NOT NULL,
        "groupId" TEXT NOT NULL,
        CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "NotificationPreferences_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `;

    console.log("Creating unique constraint on NotificationPreferences...");

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreferences_userId_groupId_key" 
      ON "NotificationPreferences"("userId", "groupId")
    `;

    console.log("Creating indexes on NotificationPreferences table...");

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "NotificationPreferences_userId_idx" 
      ON "NotificationPreferences"("userId")
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "NotificationPreferences_groupId_idx" 
      ON "NotificationPreferences"("groupId")
    `;

    console.log(
      "✅ NotificationPreferences table and indexes created successfully!"
    );
  } catch (error) {
    console.error("Error creating NotificationPreferences table:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
