import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Generate smart reply suggestions based on conversation context
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { groupId, lastMessageId } = await req.json();

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    // Get recent messages for context (last 10 messages)
    const recentMessages = await prisma.message.findMany({
      where: {
        groupId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get user's recent message patterns
    const userMessagePatterns = await prisma.message.findMany({
      where: {
        senderId: session.user.id,
        type: "text",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        content: true,
      },
    });

    // Generate context-aware suggestions
    const suggestions = generateSmartReplies(
      recentMessages,
      userMessagePatterns,
      session.user.id,
      lastMessageId
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error generating smart replies:", error);
    return NextResponse.json(
      { error: "Failed to generate smart replies" },
      { status: 500 }
    );
  }
}

interface Message {
  id: string;
  content: string;
  type?: string;
  createdAt: Date;
  senderId: string;
  sender: {
    id: string;
    name: string;
  };
}

interface UserPattern {
  content: string;
}

function generateSmartReplies(
  recentMessages: Message[],
  userPatterns: UserPattern[],
  currentUserId: string,
  lastMessageId?: string
): string[] {
  const suggestions: string[] = [];

  // Get the last message content
  const lastMessage = lastMessageId
    ? recentMessages.find((m) => m.id === lastMessageId)
    : recentMessages[0];

  if (!lastMessage || lastMessage.senderId === currentUserId) {
    // If the last message is from the current user or no message, return generic suggestions
    return [
      "👍 Got it!",
      "Thanks for sharing",
      "Let me know if you need anything",
    ];
  }

  const lastContent = lastMessage.content.toLowerCase();
  const isQuestion = lastContent.includes("?");

  // Question detection patterns
  const questionPatterns = [
    {
      pattern: /how are you|how r u|how're you/i,
      replies: [
        "I'm doing great, thanks! How about you?",
        "All good here! What's up?",
        "Pretty good! Thanks for asking 😊",
      ],
    },
    {
      pattern: /what.*doing|whatcha doing|what's up|whats up|wassup/i,
      replies: [
        "Not much, just working on some stuff",
        "Just chilling, you?",
        "Nothing special, what about you?",
      ],
    },
    {
      pattern: /when|what time/i,
      replies: [
        "Let me check and get back to you",
        "I'll confirm the time and let you know",
        "How about in an hour?",
      ],
    },
    {
      pattern: /where/i,
      replies: [
        "The usual place works for me",
        "Let me know what works for you",
        "I'll send you the location",
      ],
    },
    {
      pattern: /why/i,
      replies: [
        "That's a good question, let me explain",
        "I'll tell you more about it",
        "Let me think about that",
      ],
    },
    {
      pattern: /can you|could you|would you/i,
      replies: [
        "Sure, I can help with that!",
        "Yes, absolutely!",
        "Of course! When do you need it?",
      ],
    },
    {
      pattern: /are you|will you|do you/i,
      replies: ["Yes, definitely!", "I think so", "Not sure yet, let me check"],
    },
  ];

  // Check for question patterns
  for (const { pattern, replies } of questionPatterns) {
    if (pattern.test(lastContent)) {
      return replies.slice(0, 3);
    }
  }

  // Sentiment-based responses
  const sentimentPatterns = [
    {
      pattern: /thanks|thank you|thx|appreciate/i,
      replies: [
        "You're welcome! 😊",
        "Happy to help!",
        "Anytime! Glad I could help",
      ],
    },
    {
      pattern: /sorry|apologize|my bad/i,
      replies: [
        "No worries at all!",
        "It's all good!",
        "Don't worry about it 😊",
      ],
    },
    {
      pattern: /congrat|awesome|amazing|great job|well done|nice/i,
      replies: [
        "Thank you so much! 🎉",
        "Thanks! Really appreciate it",
        "😊 ❤️",
      ],
    },
    {
      pattern: /help|issue|problem/i,
      replies: [
        "I'm here to help! What's going on?",
        "Let me see what I can do",
        "Tell me more about it",
      ],
    },
    {
      pattern: /bye|goodbye|see you|talk later|gtg|gotta go/i,
      replies: ["Talk to you later! 👋", "See you soon!", "Bye! Take care 😊"],
    },
    {
      pattern: /lol|haha|😂|🤣/i,
      replies: ["😂", "Haha right!", "🤣"],
    },
  ];

  for (const { pattern, replies } of sentimentPatterns) {
    if (pattern.test(lastContent)) {
      return replies.slice(0, 3);
    }
  }

  // Time-based suggestions
  const hour = new Date().getHours();
  if (/good morning|morning/i.test(lastContent)) {
    return [
      "Good morning! ☀️",
      "Morning! Hope you have a great day",
      "Good morning! 😊",
    ];
  }
  if (/good night|night/i.test(lastContent)) {
    return [
      "Good night! Sleep well 🌙",
      "Night! Talk tomorrow",
      "Good night! 😴",
    ];
  }

  // Agreement/acknowledgment
  if (
    /ok|okay|sure|alright|sounds good|perfect|cool/i.test(lastContent) &&
    !isQuestion
  ) {
    return ["Great! 👍", "Perfect!", "Awesome, thanks!"];
  }

  // Learn from user patterns - extract common phrases
  const commonPhrases = extractCommonPhrases(userPatterns);
  if (commonPhrases.length >= 3) {
    return commonPhrases.slice(0, 3);
  }

  // Default context-aware suggestions based on conversation flow
  if (isQuestion) {
    return [
      "Let me check and get back to you",
      "I'll look into that",
      "Good question, give me a moment",
    ];
  }

  // Generic friendly responses
  return [
    "Got it, thanks!",
    "That makes sense",
    "Sounds good! 👍",
    "I see what you mean",
    "Interesting!",
    "Let me know if you need anything else",
  ];
}

function extractCommonPhrases(userPatterns: UserPattern[]): string[] {
  if (userPatterns.length === 0) return [];

  // Count phrase frequency
  const phraseCount = new Map<string, number>();
  const minLength = 10;
  const maxLength = 100;

  userPatterns.forEach(({ content }) => {
    if (content.length >= minLength && content.length <= maxLength) {
      const normalized = content.trim();
      phraseCount.set(normalized, (phraseCount.get(normalized) || 0) + 1);
    }
  });

  // Get phrases used more than once
  const commonPhrases = Array.from(phraseCount.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase)
    .slice(0, 5);

  return commonPhrases;
}
