import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account exists with this email, you will receive a password reset link.",
        },
        { status: 200 }
      );
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Delete any existing unused reset tokens for this email
    await prisma.passwordReset.deleteMany({
      where: {
        email,
        used: false,
      },
    });

    // Create new reset token (valid for 1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.passwordReset.create({
      data: {
        email,
        token: resetToken,
        expiresAt,
      },
    });

    // Send reset email asynchronously (don't await - fire and forget)
    sendPasswordResetEmail(email, resetToken).catch((emailError) => {
      console.error("Password reset email failed:", emailError);
    });

    // Return immediately - don't wait for email
    return NextResponse.json(
      {
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
