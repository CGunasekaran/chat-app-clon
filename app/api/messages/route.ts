import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveMentions } from "@/lib/mentions";

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
      replyTo: {
        select: {
          id: true,
          content: true,
          type: true,
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      mentions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
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

  const {
    groupId,
    content,
    type,
    fileUrl,
    fileName,
    fileType,
    replyToId,
    isPriority,
  } = await req.json();

  // Resolve mentions in the content
  const mentions = await resolveMentions(content || "", groupId);
  const hasMentions = mentions.length > 0;

  const message = await prisma.message.create({
    data: {
      content: content || "",
      type: type || "text",
      fileUrl,
      fileName,
      fileType,
      groupId,
      senderId: session.user.id,
      replyToId: replyToId || undefined,
      isPriority: isPriority || false,
      hasMentions,
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
      replyTo: {
        select: {
          id: true,
          content: true,
          type: true,
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Create mention records
  if (mentions.length > 0) {
    await prisma.mention.createMany({
      data: mentions.map((mention) => ({
        messageId: message.id,
        userId: mention.userId,
        startIndex: mention.startIndex,
        length: mention.length,
        isAll: mention.isAll,
      })),
    });
  }

  // Fetch message with mentions for response
  const messageWithMentions = await prisma.message.findUnique({
    where: { id: message.id },
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
      replyTo: {
        select: {
          id: true,
          content: true,
          type: true,
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      mentions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(messageWithMentions);
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

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!userExists) {
      console.error(
        "User from session not found in database:",
        session.user.id
      );
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
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
