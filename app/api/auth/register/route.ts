import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Check if email is verified (skip in development)
    const isDevelopment = process.env.NODE_ENV === "development";
    
    if (!isDevelopment) {
      const verification = await prisma.emailVerification.findFirst({
        where: {
          email,
          verified: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!verification) {
        return NextResponse.json(
          { error: "Email not verified. Please verify your email first." },
          { status: 400 }
        );
      }

      // Check if verification is not too old (valid for 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (verification.createdAt < oneHourAgo) {
        return NextResponse.json(
          { error: "Email verification expired. Please verify again." },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    // Delete used verification records (only if verified in production)
    if (!isDevelopment) {
      await prisma.emailVerification.deleteMany({
        where: { email },
      });
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
