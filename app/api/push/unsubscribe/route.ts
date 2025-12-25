import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    await prisma.pushSubscription.deleteMany({
      where: { endpoint: subscription.endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json(
      { error: "Failed to remove subscription", details: error.message },
      { status: 500 }
    );
  }
}
