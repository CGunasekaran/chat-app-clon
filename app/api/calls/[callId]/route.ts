import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Update call (end call, set duration, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { callId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { callId } = params;
    const { status, endedAt, duration } = await req.json();

    // Find the call
    const call = await prisma.call.findFirst({
      where: {
        id: callId,
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Update call
    const updateData: any = {};
    if (status) updateData.status = status;
    if (endedAt) updateData.endedAt = new Date(endedAt);
    if (duration !== undefined) updateData.duration = duration;

    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: updateData,
    });

    return NextResponse.json(updatedCall);
  } catch (error) {
    console.error("Error updating call:", error);
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    );
  }
}
