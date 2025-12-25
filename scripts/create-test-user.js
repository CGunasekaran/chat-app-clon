const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const email = "test@example.com";
    const name = "Test User";
    const password = "Test@123";

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`✅ User ${email} already exists!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${password}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create test user (no email verification needed for local)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isAdmin: false,
      },
    });

    console.log("\n✅ Test user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Name: ${user.name}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👑 Admin: ${user.isAdmin}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("🎯 You can now login at: http://localhost:3000/login");
  } catch (error) {
    console.error("❌ Error creating test user:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
