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
    (member) => member.user.id === session.user.id
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
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Check if user is the admin
  if (group.adminId !== session.user.id) {
    return NextResponse.json(
      { error: "Only the admin can delete the group" },
      { status: 403 }
    );
  }

  // Delete the group (members and messages will be cascade deleted)
  await prisma.group.delete({
    where: { id: groupId },
  });

  return NextResponse.json({ message: "Group deleted successfully" });
}
