import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();

    // Try to query the database
    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      userCount,
      databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
    });
  } catch (error: any) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
