import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get call history for a user or group
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  try {
    const where: any = {
      OR: [
        { initiatorId: session.user.id },
        {
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    };

    if (groupId) {
      where.groupId = groupId;
    }

    const calls = await prisma.call.findMany({
      where,
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error("Error fetching call history:", error);
    return NextResponse.json(
      { error: "Failed to fetch call history" },
      { status: 500 }
    );
  }
}

// Create a new call
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { groupId, type, participantIds, isGroupCall } = await req.json();

    if (!type || !participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { error: "Type and participants are required" },
        { status: 400 }
      );
    }

    // Create call
    const call = await prisma.call.create({
      data: {
        type,
        isGroupCall: isGroupCall || false,
        status: "initiated",
        initiatorId: session.user.id,
        groupId: groupId || null,
        participants: {
          create: participantIds.map((userId: string) => ({
            userId,
            status: "invited",
          })),
        },
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(call);
  } catch (error) {
    console.error("Error creating call:", error);
    return NextResponse.json(
      { error: "Failed to create call" },
      { status: 500 }
    );
  }
}

// Update call (status, duration, quality, recording URL)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { callId, status, duration, quality, recordingUrl } =
      await req.json();

    if (!callId) {
      return NextResponse.json(
        { error: "Call ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (duration !== undefined) updateData.duration = duration;
    if (quality) updateData.quality = quality;
    if (recordingUrl) updateData.recordingUrl = recordingUrl;

    if (status === "ended" || status === "missed" || status === "rejected") {
      updateData.endedAt = new Date();
    }

    const call = await prisma.call.update({
      where: { id: callId },
      data: updateData,
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(call);
  } catch (error) {
    console.error("Error updating call:", error);
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    );
  }
}

// Update participant status (joined, left, rejected)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { callId, status } = await req.json();

    if (!callId || !status) {
      return NextResponse.json(
        { error: "Call ID and status are required" },
        { status: 400 }
      );
    }

    // Find participant
    const participant = await prisma.callParticipant.findFirst({
      where: {
        callId,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Update participant
    const updateData: any = { status };

    if (status === "joined") {
      updateData.joinedAt = new Date();
    } else if (status === "left") {
      updateData.leftAt = new Date();
    }

    const updatedParticipant = await prisma.callParticipant.update({
      where: { id: participant.id },
      data: updateData,
    });

    return NextResponse.json(updatedParticipant);
  } catch (error) {
    console.error("Error updating participant:", error);
    return NextResponse.json(
      { error: "Failed to update participant" },
      { status: 500 }
    );
  }
}
