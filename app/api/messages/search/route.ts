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
  const query = searchParams.get("query");

  if (!query || !groupId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: {
      groupId,
      content: {
        contains: query,
        mode: "insensitive",
      },
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(messages);
}
