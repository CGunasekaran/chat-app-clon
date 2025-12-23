import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create or get one-to-one chat
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otherUserId } = await req.json();

  if (!otherUserId) {
    return NextResponse.json(
      { error: "Other user ID is required" },
      { status: 400 }
    );
  }

  try {
    // Check if one-to-one chat already exists
    const existingChat = await prisma.group.findFirst({
      where: {
        isOneToOne: true,
        members: {
          every: {
            OR: [{ userId: session.user.id }, { userId: otherUserId }],
          },
        },
      },
      include: {
        members: {
          where: {
            OR: [{ userId: session.user.id }, { userId: otherUserId }],
          },
        },
      },
    });

    // If chat exists and has exactly 2 members (both users), return it
    if (existingChat && existingChat.members.length === 2) {
      return NextResponse.json(existingChat);
    }

    // Get the other user's name
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { name: true },
    });

    if (!otherUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create new one-to-one chat
    const chat = await prisma.group.create({
      data: {
        name: otherUser.name, // Use other user's name
        isOneToOne: true,
        adminId: session.user.id,
        members: {
          create: [{ userId: session.user.id }, { userId: otherUserId }],
        },
      },
    });

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}
