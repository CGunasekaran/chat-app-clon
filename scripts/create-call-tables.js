const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createCallTables() {
  try {
    console.log("Creating Call and CallParticipant tables...");

    // Create Call table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Call" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "type" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'initiated',
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "endedAt" TIMESTAMP(3),
        "duration" INTEGER,
        "isGroupCall" BOOLEAN NOT NULL DEFAULT false,
        "recordingUrl" TEXT,
        "quality" TEXT,
        "initiatorId" TEXT NOT NULL,
        "groupId" TEXT,
        CONSTRAINT "Call_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Call_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    // Create indexes for Call table
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Call_initiatorId_idx" ON "Call"("initiatorId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Call_groupId_idx" ON "Call"("groupId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Call_status_idx" ON "Call"("status");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Call_startedAt_idx" ON "Call"("startedAt");`;

    // Create CallParticipant table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "CallParticipant" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "leftAt" TIMESTAMP(3),
        "status" TEXT NOT NULL DEFAULT 'invited',
        "callId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        CONSTRAINT "CallParticipant_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "CallParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "CallParticipant_callId_userId_key" UNIQUE ("callId", "userId")
      );
    `;

    // Create indexes for CallParticipant table
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CallParticipant_callId_idx" ON "CallParticipant"("callId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "CallParticipant_userId_idx" ON "CallParticipant"("userId");`;

    console.log("✅ Call and CallParticipant tables created successfully!");
  } catch (error) {
    console.error("Error creating Call tables:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createCallTables();
