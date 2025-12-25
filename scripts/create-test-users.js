const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log("🔧 Creating test users...\n");

    const testUsers = [
      {
        name: "Admin User",
        email: "admin@test.com",
        password: "admin123",
        isAdmin: true,
      },
      {
        name: "John Doe",
        email: "john@test.com",
        password: "john123",
        isAdmin: false,
      },
      {
        name: "Jane Smith",
        email: "jane@test.com",
        password: "jane123",
        isAdmin: false,
      },
      {
        name: "Bob Wilson",
        email: "bob@test.com",
        password: "bob123",
        isAdmin: false,
      },
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existing) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          isAdmin: userData.isAdmin,
        },
      });

      console.log(`✅ Created user: ${user.name} (${user.email})`);
    }

    console.log("\n📋 Test User Credentials:");
    console.log("─────────────────────────────────────────");
    testUsers.forEach((user) => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.isAdmin ? "Admin" : "User"}`);
      console.log("─────────────────────────────────────────");
    });

    console.log("\n✨ Test users created successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
