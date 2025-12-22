const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://gsekara2@localhost:5432/whatsapp_clone?schema=public",
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function makeFirstUserAdmin() {
  try {
    // Get the first user by creation date
    const firstUser = await prisma.user.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!firstUser) {
      console.log("No users found in database");
      return;
    }

    // Update to make them admin
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { isAdmin: true },
    });

    console.log(`✓ Made ${firstUser.name} (${firstUser.email}) an admin`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

makeFirstUserAdmin();
