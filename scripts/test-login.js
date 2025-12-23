const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const bcrypt = require("bcryptjs");

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://gsekara2@localhost:5432/whatsapp_clone?schema=public",
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testLogin() {
  const email = process.argv[2] || "gunagm2311@gmaill.com";
  const password = process.argv[3] || "admin12345";

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`User found: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Admin: ${user.isAdmin}`);
    console.log(`\nTesting password: ${password}`);
    console.log(`Stored hash: ${user.password.substring(0, 30)}...`);

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      console.log(`\n✓ Password is CORRECT!`);
      console.log(`You can login with:`);
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
    } else {
      console.log(`\n❌ Password is INCORRECT`);
      console.log(`The password "${password}" does not match the stored hash`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
