const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`\n📋 Total Users: ${users.length}\n`);

    if (users.length === 0) {
      console.log("No users found in database.");
    } else {
      console.table(users);
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
