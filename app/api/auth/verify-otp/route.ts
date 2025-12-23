import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Find the OTP record
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        otp,
        verified: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!verification) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Check if OTP is expired
    if (new Date() > verification.expiresAt) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    // Mark as verified
    await prisma.emailVerification.update({
      where: {
        id: verification.id,
      },
      data: {
        verified: true,
      },
    });

    return NextResponse.json(
      {
        message: "Email verified successfully",
        verified: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
