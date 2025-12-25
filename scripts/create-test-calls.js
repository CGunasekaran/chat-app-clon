const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createTestCalls() {
  try {
    console.log("🔧 Creating test call history...\n");

    // Get all users
    const users = await prisma.user.findMany();

    if (users.length < 2) {
      console.log("❌ Need at least 2 users to create test calls");
      console.log("Run: node scripts/create-test-users.js first");
      return;
    }

    const [admin, john, jane, bob] = users;

    // Create some test calls
    const callsData = [
      {
        type: "video",
        status: "ended",
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        endedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
        duration: 1800, // 30 minutes
        isGroupCall: false,
        quality: "excellent",
        initiatorId: admin.id,
        participants: [john.id],
      },
      {
        type: "audio",
        status: "ended",
        startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        endedAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000),
        duration: 1200, // 20 minutes
        isGroupCall: false,
        quality: "good",
        initiatorId: john.id,
        participants: [admin.id],
      },
      {
        type: "video",
        status: "missed",
        startedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        isGroupCall: false,
        initiatorId: jane ? jane.id : john.id,
        participants: [admin.id],
      },
      {
        type: "audio",
        status: "ended",
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        endedAt: new Date(Date.now() - 23.8 * 60 * 60 * 1000),
        duration: 720, // 12 minutes
        isGroupCall: false,
        quality: "fair",
        initiatorId: admin.id,
        participants: [jane ? jane.id : john.id],
      },
      {
        type: "video",
        status: "rejected",
        startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        isGroupCall: false,
        initiatorId: bob ? bob.id : john.id,
        participants: [admin.id],
      },
    ];

    for (const callData of callsData) {
      const participantIds = callData.participants;
      delete callData.participants;

      const call = await prisma.call.create({
        data: {
          ...callData,
          participants: {
            create: participantIds.map((userId) => ({
              userId,
              status:
                callData.status === "ended" || callData.status === "active"
                  ? "joined"
                  : callData.status === "rejected"
                  ? "rejected"
                  : "invited",
              joinedAt:
                callData.status === "ended" ? callData.startedAt : undefined,
              leftAt:
                callData.status === "ended" ? callData.endedAt : undefined,
            })),
          },
        },
        include: {
          initiator: true,
          participants: {
            include: {
              user: true,
            },
          },
        },
      });

      console.log(
        `✅ Created ${call.type} call: ${
          call.initiator.name
        } → ${call.participants.map((p) => p.user.name).join(", ")} (${
          call.status
        })`
      );
    }

    // Create a group call if there's a group
    const groups = await prisma.group.findMany({
      include: {
        members: true,
      },
    });

    if (groups.length > 0) {
      const group = groups[0];
      const memberIds = group.members.map((m) => m.userId);

      if (memberIds.length >= 2) {
        const groupCall = await prisma.call.create({
          data: {
            type: "video",
            status: "ended",
            startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
            endedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
            duration: 1800, // 30 minutes
            isGroupCall: true,
            quality: "excellent",
            initiatorId: memberIds[0],
            groupId: group.id,
            participants: {
              create: memberIds.map((userId) => ({
                userId,
                status: "joined",
                joinedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
                leftAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
              })),
            },
          },
          include: {
            initiator: true,
            group: true,
            participants: {
              include: {
                user: true,
              },
            },
          },
        });

        console.log(
          `✅ Created group call: ${groupCall.group?.name} (${groupCall.participants.length} participants)`
        );
      }
    }

    console.log("\n✨ Test call history created successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCalls();
