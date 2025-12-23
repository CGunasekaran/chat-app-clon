import prisma from "@/lib/prisma";

export interface MentionData {
  userId: string | null; // null for @all
  startIndex: number;
  length: number;
  isAll: boolean;
}

export interface ParsedMention {
  userId: string | null;
  userName: string;
  startIndex: number;
  length: number;
  isAll: boolean;
}

/**
 * Parse @mentions from message content
 * Supports @username and @all formats
 */
export function parseMentions(
  content: string
): { text: string; index: number; isAll: boolean }[] {
  const mentionPattern = /@(\w+)/g;
  const mentions: { text: string; index: number; isAll: boolean }[] = [];
  let match;

  while ((match = mentionPattern.exec(content)) !== null) {
    const mentionText = match[1];
    const isAll = mentionText.toLowerCase() === "all";

    mentions.push({
      text: mentionText,
      index: match.index,
      isAll,
    });
  }

  return mentions;
}

/**
 * Resolve mentions to actual user IDs
 */
export async function resolveMentions(
  content: string,
  groupId: string
): Promise<ParsedMention[]> {
  const rawMentions = parseMentions(content);

  if (rawMentions.length === 0) {
    return [];
  }

  // Get all group members
  const groupMembers = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const resolvedMentions: ParsedMention[] = [];

  for (const mention of rawMentions) {
    if (mention.isAll) {
      // @all mention
      resolvedMentions.push({
        userId: null,
        userName: "all",
        startIndex: mention.index,
        length: mention.text.length + 1, // +1 for @ symbol
        isAll: true,
      });
    } else {
      // Find user by name (case-insensitive)
      const member = groupMembers.find(
        (m) => m.user.name.toLowerCase() === mention.text.toLowerCase()
      );

      if (member) {
        resolvedMentions.push({
          userId: member.user.id,
          userName: member.user.name,
          startIndex: mention.index,
          length: mention.text.length + 1, // +1 for @ symbol
          isAll: false,
        });
      }
    }
  }

  return resolvedMentions;
}

/**
 * Get user IDs that should be notified for a message
 */
export async function getMentionedUserIds(
  mentions: ParsedMention[],
  groupId: string
): Promise<string[]> {
  if (mentions.length === 0) {
    return [];
  }

  // Check if @all is mentioned
  const hasAllMention = mentions.some((m) => m.isAll);

  if (hasAllMention) {
    // Get all group members
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  // Return specific user IDs
  return mentions
    .filter((m) => m.userId !== null)
    .map((m) => m.userId as string);
}

/**
 * Highlight mentions in message content for display
 */
export function highlightMentions(
  content: string,
  mentions: ParsedMention[]
): string {
  if (mentions.length === 0) {
    return content;
  }

  // Sort mentions by index in reverse order to maintain correct positions
  const sortedMentions = [...mentions].sort(
    (a, b) => b.startIndex - a.startIndex
  );

  let highlightedContent = content;

  for (const mention of sortedMentions) {
    const before = highlightedContent.slice(0, mention.startIndex);
    const mentionText = highlightedContent.slice(
      mention.startIndex,
      mention.startIndex + mention.length
    );
    const after = highlightedContent.slice(mention.startIndex + mention.length);

    highlightedContent = `${before}<span class="mention" data-user-id="${
      mention.userId || "all"
    }">${mentionText}</span>${after}`;
  }

  return highlightedContent;
}

/**
 * Create mention autocomplete suggestions
 */
export async function getMentionSuggestions(
  query: string,
  groupId: string
): Promise<{ id: string; name: string; avatar: string | null }[]> {
  const groupMembers = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  const lowerQuery = query.toLowerCase();

  // Filter users by name match
  const filteredUsers = groupMembers
    .filter((m) => m.user.name.toLowerCase().includes(lowerQuery))
    .map((m) => m.user)
    .slice(0, 10); // Limit to 10 suggestions

  // Add @all option if query matches
  const suggestions = [...filteredUsers];

  if ("all".includes(lowerQuery)) {
    suggestions.unshift({
      id: "all",
      name: "all",
      avatar: null,
    });
  }

  return suggestions;
}
