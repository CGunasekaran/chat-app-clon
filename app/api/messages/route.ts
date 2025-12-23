import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  const messages = await prisma.message.findMany({
    where: { groupId: groupId! },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      readBy: {
        select: {
          userId: true,
          readAt: true,
        },
      },
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, content, type, fileUrl, fileName, fileType } =
    await req.json();

  const message = await prisma.message.create({
    data: {
      content: content || "",
      type: type || "text",
      fileUrl,
      fileName,
      fileType,
      groupId,
      senderId: session.user.id,
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      readBy: {
        select: {
          userId: true,
          readAt: true,
        },
      },
      reactions: {
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

  return NextResponse.json(message);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { messageId } = body;

    if (!messageId) {
      console.error("Missing messageId in request body:", body);
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }

    // Mark message as read by current user
    await prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId: session.user.id,
        },
      },
      create: {
        messageId,
        userId: session.user.id,
      },
      update: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking message as read:", error);
    return NextResponse.json(
      { error: "Failed to mark message as read" },
      { status: 500 }
    );
  }
}
