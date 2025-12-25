import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        select: {
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

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Check if user is a member
  const isMember = group.members.some(
    (member: { user: { id: string; name: string; avatar: string | null } }) =>
      member.user.id === session.user.id
  );

  if (!isMember) {
    return NextResponse.json(
      { error: "You are not a member of this group" },
      { status: 403 }
    );
  }

  return NextResponse.json(group);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      adminId: true,
      isOneToOne: true,
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // For one-on-one chats, allow any participant to delete
  if (group.isOneToOne) {
    const isMember = group.members.some(
      (member) => member.userId === session.user.id
    );
    if (!isMember) {
      return NextResponse.json(
        { error: "You are not a participant of this chat" },
        { status: 403 }
      );
    }
  } else {
    // For group chats, only the admin can delete
    if (group.adminId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the admin can delete the group" },
        { status: 403 }
      );
    }
  }

  // Delete the group (members, messages, calls will be cascade deleted due to schema relations)
  await prisma.group.delete({
    where: { id: groupId },
  });

  return NextResponse.json({
    message: group.isOneToOne
      ? "Chat deleted successfully"
      : "Group deleted successfully",
  });
}
