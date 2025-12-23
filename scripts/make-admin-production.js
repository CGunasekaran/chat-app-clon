const { Client } = require("pg");

const DATABASE_URL =
  "postgresql://guna_sekaran:G06lVmhMYfDkPNv3VMUHkFAT5WUIjanW@dpg-d54nt6muk2gs73bfm4dg-a.virginia-postgres.render.com/chat_db_wqnk";
const EMAIL = "gunasekaran.bsc.cs@gmail.com";

async function makeAdmin() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log("Connected to database...");

    // First, list all users
    const allUsers = await client.query(
      'SELECT id, email, name, "isAdmin" FROM "User"'
    );
    console.log("\nAll users in database:");
    console.log(allUsers.rows);

    // Then try to update
    const result = await client.query(
      'UPDATE "User" SET "isAdmin" = true WHERE "email" = $1 RETURNING id, email, "isAdmin"',
      [EMAIL]
    );

    if (result.rowCount === 0) {
      console.log(`\n❌ No user found with email: ${EMAIL}`);
      console.log("Make sure the user is registered first!");
    } else {
      console.log("\n✅ User updated successfully!");
      console.log("Admin user:", result.rows[0]);
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

makeAdmin();
