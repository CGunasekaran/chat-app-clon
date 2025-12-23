import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { groupId } = params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get or create notification preferences
    let preferences = await prisma.notificationPreferences.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: groupId,
        },
      },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: {
          userId: user.id,
          groupId: groupId,
          sound: "default",
          showPreview: true,
          isPriority: false,
          onlyMentions: false,
          bundleMessages: true,
        },
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { groupId } = params;
    const body = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const {
      sound,
      showPreview,
      isPriority,
      muteUntil,
      onlyMentions,
      bundleMessages,
    } = body;

    const preferences = await prisma.notificationPreferences.upsert({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: groupId,
        },
      },
      update: {
        ...(sound !== undefined && { sound }),
        ...(showPreview !== undefined && { showPreview }),
        ...(isPriority !== undefined && { isPriority }),
        ...(muteUntil !== undefined && {
          muteUntil: muteUntil ? new Date(muteUntil) : null,
        }),
        ...(onlyMentions !== undefined && { onlyMentions }),
        ...(bundleMessages !== undefined && { bundleMessages }),
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        groupId: groupId,
        sound: sound || "default",
        showPreview: showPreview !== undefined ? showPreview : true,
        isPriority: isPriority || false,
        muteUntil: muteUntil ? new Date(muteUntil) : null,
        onlyMentions: onlyMentions || false,
        bundleMessages: bundleMessages !== undefined ? bundleMessages : true,
      },
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
