import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const subscription = await request.json();

    // Save subscription (can be anonymous or associated with user)
    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: session?.user?.email || null,
        userAgent: request.headers.get("user-agent") || undefined,
        updatedAt: new Date(),
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: session?.user?.email || null,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: saved,
    });
  } catch (error: any) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json(
      { error: "Failed to save subscription", details: error.message },
      { status: 500 }
    );
  }
}
