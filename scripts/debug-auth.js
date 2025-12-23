const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const bcrypt = require("bcryptjs");

const pool = new pg.Pool({
  connectionString:
    "postgresql://gsekara2@localhost:5432/whatsapp_clone?schema=public",
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function debugAuth() {
  const email = "gunagm2311@gmaill.com";
  const password = "admin12345";

  console.log("=".repeat(50));
  console.log("AUTH DEBUG TEST");
  console.log("=".repeat(50));
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log("");

  try {
    // Exact same logic as in auth.ts
    if (!email || !password) {
      console.log("❌ Missing credentials");
      return;
    }

    console.log("Step 1: Finding user...");
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("✓ User found!");
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  isAdmin: ${user.isAdmin}`);
    console.log(
      `  Password hash (first 40 chars): ${user.password.substring(0, 40)}...`
    );
    console.log("");

    console.log("Step 2: Comparing password...");
    console.log(`  Input password: "${password}"`);
    console.log(`  Password length: ${password.length}`);

    const isPasswordValid = await bcrypt.compare(password, user.password);

    console.log(`  bcrypt.compare result: ${isPasswordValid}`);
    console.log("");

    if (!isPasswordValid) {
      console.log("❌ Password comparison FAILED");
      console.log("");
      console.log("Trying to re-hash the password to verify:");
      const newHash = await bcrypt.hash(password, 10);
      console.log(`  New hash: ${newHash.substring(0, 40)}...`);
      const testCompare = await bcrypt.compare(password, newHash);
      console.log(`  Test compare with new hash: ${testCompare}`);
      return;
    }

    console.log("✅ Password is VALID!");
    console.log("");
    console.log("Would return user object:");
    console.log({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error("💥 Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();
