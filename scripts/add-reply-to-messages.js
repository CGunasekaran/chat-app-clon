const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding replyToId column to Message table...");

    // Add replyToId column
    await prisma.$executeRaw`
      ALTER TABLE "Message" 
      ADD COLUMN IF NOT EXISTS "replyToId" TEXT;
    `;

    // Add foreign key constraint
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'Message_replyToId_fkey'
        ) THEN
          ALTER TABLE "Message" 
          ADD CONSTRAINT "Message_replyToId_fkey" 
          FOREIGN KEY ("replyToId") 
          REFERENCES "Message"("id") 
          ON DELETE SET NULL 
          ON UPDATE CASCADE;
        END IF;
      END $$;
    `;

    console.log("✅ Successfully added reply functionality to Message table");
  } catch (error) {
    console.error("Error adding reply functionality:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
