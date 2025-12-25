const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function addMissingColumns() {
  try {
    console.log(
      "🔄 Checking and adding missing columns to production database...\n"
    );

    // Add isPriority column to Message table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Message" 
      ADD COLUMN IF NOT EXISTS "isPriority" BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log("✅ Added isPriority column to Message table");

    // Add hasMentions column to Message table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Message" 
      ADD COLUMN IF NOT EXISTS "hasMentions" BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log("✅ Added hasMentions column to Message table");

    // Create Mention table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Mention" (
        "id" TEXT NOT NULL,
        "messageId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log("✅ Created Mention table");

    // Add indexes if they don't exist
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Mention_messageId_idx" ON "Mention"("messageId");
    `);
    console.log("✅ Created index on Mention.messageId");

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Mention_userId_idx" ON "Mention"("userId");
    `);
    console.log("✅ Created index on Mention.userId");

    // Add foreign key constraints if they don't exist
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
    console.log("✅ Added foreign key constraint for Mention.messageId");

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
    console.log("✅ Added foreign key constraint for Mention.userId");

    console.log(
      "\n✅ All missing columns and tables have been added successfully!"
    );
    console.log("🎉 Your production database is now up to date!");
  } catch (error) {
    console.error("❌ Error updating database:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns();
