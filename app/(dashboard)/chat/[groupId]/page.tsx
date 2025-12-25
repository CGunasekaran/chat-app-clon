"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import VoiceCall from "@/components/chat/VoiceCall";
import VideoCall from "@/components/chat/VideoCall";
import IncomingCall from "@/components/chat/IncomingCall";
import AlertDialog from "@/components/ui/AlertDialog";
import {
  ArrowLeft,
  Users,
  Trash2,
  X,
  Search,
  Video,
  Palette,
  Phone,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  type: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;
  reactions?: Array<{
    id: string;
    emoji: string;
    userId: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
  }>;
}

interface Member {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  adminId: string;
  isOneToOne?: boolean;
  members: Member[];
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    fromName: string;
    callType: "video" | "audio";
    callId: string;
  } | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("default");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: string }>(
    {}
  );
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    message: string;
    type: "error" | "success" | "info";
    onClose?: () => void;
  }>({
    isOpen: false,
    message: "",
    type: "error",
  });

  // Enable session timeout - auto logout after 15 minutes of inactivity
  useSessionTimeout();

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem(`chat-theme-${groupId}`);
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    }
  }, [groupId]);

  // Save theme to localStorage
  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    localStorage.setItem(`chat-theme-${groupId}`, theme);
    setShowThemeSelector(false);
  };

  // Theme configurations
  const themes = {
    default: {
      name: "Default",
      bg: "bg-gray-50",
      pattern: "",
    },
    ocean: {
      name: "Ocean",
      bg: "bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100",
      pattern: "",
    },
    sunset: {
      name: "Sunset",
      bg: "bg-gradient-to-br from-orange-100 via-pink-50 to-purple-100",
      pattern: "",
    },
    forest: {
      name: "Forest",
      bg: "bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100",
      pattern: "",
    },
    lavender: {
      name: "Lavender",
      bg: "bg-gradient-to-br from-purple-100 via-pink-50 to-indigo-100",
      pattern: "",
    },
    dark: {
      name: "Dark",
      bg: "bg-gradient-to-br from-gray-800 via-gray-900 to-black",
      pattern: "",
    },
    midnight: {
      name: "Midnight",
      bg: "bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900",
      pattern: "",
    },
    rose: {
      name: "Rose",
      bg: "bg-gradient-to-br from-rose-100 via-pink-50 to-fuchsia-100",
      pattern: "",
    },
    mint: {
      name: "Mint",
      bg: "bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100",
      pattern: "",
    },
    peach: {
      name: "Peach",
      bg: "bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100",
      pattern: "",
    },
    sakura: {
      name: "Sakura",
      bg: "bg-gradient-to-br from-pink-100 via-rose-50 to-red-100",
      pattern: "",
    },
    arctic: {
      name: "Arctic",
      bg: "bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100",
      pattern: "",
    },
    aurora: {
      name: "Aurora",
      bg: "bg-gradient-to-br from-violet-200 via-fuchsia-200 to-pink-200",
      pattern: "",
    },
    tropical: {
      name: "Tropical",
      bg: "bg-gradient-to-br from-lime-100 via-green-100 to-emerald-100",
      pattern: "",
    },
    desert: {
      name: "Desert",
      bg: "bg-gradient-to-br from-yellow-100 via-orange-100 to-amber-100",
      pattern: "",
    },
    galaxy: {
      name: "Galaxy",
      bg: "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600",
      pattern: "",
    },
    bubbles: {
      name: "Bubbles",
      bg: "bg-white",
      pattern:
        "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    },
    geometric: {
      name: "Geometric",
      bg: "bg-gradient-to-br from-indigo-50 to-blue-50",
      pattern:
        "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.08' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")",
    },
    dots: {
      name: "Dots",
      bg: "bg-gradient-to-br from-slate-50 to-gray-100",
      pattern:
        "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.15' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='2'/%3E%3Ccircle cx='13' cy='13' r='2'/%3E%3C/g%3E%3C/svg%3E\")",
    },
    zigzag: {
      name: "Zigzag",
      bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
      pattern:
        "url(\"data:image/svg+xml,%3Csvg width='40' height='12' viewBox='0 0 40 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 6.172L6.172 0h5.656L0 11.828V6.172zm40 5.656L28.172 0h5.656L40 6.172v5.656zM6.172 12l12-12h3.656l12 12h-5.656L20 3.828 11.828 12H6.172zm12 0L20 10.172 21.828 12h-3.656z' fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E\")",
    },
    hexagons: {
      name: "Hexagons",
      bg: "bg-gradient-to-br from-purple-50 to-pink-50",
      pattern:
        "url(\"data:image/svg+xml,%3Csvg width='56' height='100' viewBox='0 0 56 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='%239C92AC' stroke-opacity='0.08' stroke-width='2'/%3E%3Cpath d='M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34' fill='none' stroke='%239C92AC' stroke-opacity='0.08' stroke-width='2'/%3E%3C/svg%3E\")",
    },
    waves: {
      name: "Waves",
      bg: "bg-gradient-to-br from-cyan-50 to-blue-50",
      pattern:
        "url(\"data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 13.718-1.21 22.272-4.402l1.768-.661C33.64 5.347 39.647 4 50 4c10.271 0 15.362 1.222 24.629 4.928C84.112 12.722 89.438 14 100 14v-2c-10.271 0-15.362-1.222-24.629-4.928C65.888 3.278 60.562 2 50 2 39.374 2 33.145 3.397 23.34 7.063l-1.767.662C13.223 10.84 8.163 12 0 12v2z' fill='%239C92AC' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E\")",
    },
    sparkles: {
      name: "Sparkles",
      bg: "bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50",
      pattern:
        "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFA500' fill-opacity='0.15'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0-5.523-4.477-10-10-10zm-30 0c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0-5.523-4.477-10-10-10zm60 0c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0-5.523-4.477-10-10-10z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    },
  };

  const currentThemeConfig =
    themes[currentTheme as keyof typeof themes] || themes.default;

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showMembers) setShowMembers(false);
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        if (showSearch) setShowSearch(false);
        if (showThemeSelector) setShowThemeSelector(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showMembers, showDeleteConfirm, showSearch, showThemeSelector]);

  useEffect(() => {
    // Fetch group details
    fetch(`/api/groups/${groupId}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) {
          throw new Error(`Failed to load group: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data === null) return;
        if (data.error) {
          setAlertDialog({
            isOpen: true,
            message: `Error: ${data.error}`,
            type: "error",
          });
          return;
        }
        setGroup(data);
      })
      .catch((error) => {
        setAlertDialog({
          isOpen: true,
          message: `Unable to load group. ${
            error.message || "Please try again."
          }`,
          type: "error",
        });
      });

    // Fetch initial messages
    fetch(`/api/messages?groupId=${groupId}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) {
          throw new Error(`Failed to load messages: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data === null) return;
        if (data.error) {
          setAlertDialog({
            isOpen: true,
            message: `Error: ${data.error}`,
            type: "error",
          });
          return;
        }
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch((error) => {
        setAlertDialog({
          isOpen: true,
          message: `Unable to load messages. ${
            error.message || "Please try again."
          }`,
          type: "error",
        });
      });

    // Fetch current user
    fetch("/api/auth/session")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (!res.ok) {
          throw new Error("Failed to authenticate");
        }
        return res.json();
      })
      .then((data) => {
        if (data === null) return;
        if (
          !data ||
          !data.user ||
          !data.user.id ||
          Object.keys(data).length === 0
        ) {
          router.push("/login");
          return;
        }
        setCurrentUserId(data.user.id);
        setCurrentUserName(data.user.name || "User");
      })
      .catch((error) => {
        setAlertDialog({
          isOpen: true,
          message: `Authentication error: ${error.message}. Please login again.`,
          type: "error",
          onClose: () => {
            setAlertDialog({ isOpen: false, message: "", type: "error" });
            router.push("/login");
          },
        });
      });
  }, [groupId, router]);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    socket.emit("join-group", groupId);
    // Join user-specific room for direct calls
    socket.emit("join-user-room", currentUserId);

    socket.on("receive-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("incoming-voice-call", () => {
      setIsVoiceCallActive(true);
    });

    socket.on(
      "incoming-call",
      ({
        from,
        fromName,
        callType,
        callId,
      }: {
        from: string;
        fromName: string;
        callType: "video" | "audio";
        callId: string;
      }) => {
        if (from !== currentUserId) {
          setIncomingCall({ from, fromName, callType, callId });
        }
      }
    );

    socket.on("call-accepted", ({ by }: { by: string }) => {
      if (by !== currentUserId) {
        // Start the call for the initiator
        setIsVideoCallActive(true);
        setCallStartTime(new Date());
      }
    });

    socket.on("call-rejected", async ({ by }: { by: string }) => {
      if (by !== currentUserId) {
        // Update call record to rejected with 0 duration
        if (currentCallId) {
          try {
            await fetch(`/api/calls/${currentCallId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "rejected",
                endedAt: new Date().toISOString(),
                duration: 0,
              }),
            });
          } catch (error) {
            console.error("Failed to update call record:", error);
          }
        }

        setAlertDialog({
          isOpen: true,
          message: "Call was declined",
          type: "info",
          onClose: () =>
            setAlertDialog({ isOpen: false, message: "", type: "info" }),
        });
        setIsVideoCallActive(false);
        setIsVoiceCallActive(false);
        setOtherUserId(null);
        setCurrentCallId(null);
        setCallStartTime(null);
      }
    });

    socket.on("call-cancelled", () => {
      // Caller cancelled before we could answer
      setIncomingCall(null);
    });

    socket.on(
      "user-typing",
      ({ userId, userName }: { userId: string; userName: string }) => {
        if (userId !== currentUserId) {
          setTypingUsers((prev) => ({ ...prev, [userId]: userName }));
        }
      }
    );

    socket.on("user-stopped-typing", ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    });

    socket.on(
      "messages-read",
      ({ userId, messageIds }: { userId: string; messageIds: string[] }) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (messageIds.includes(msg.id)) {
              const existingReadBy = msg.readBy || [];
              const alreadyRead = existingReadBy.some(
                (r) => r.userId === userId
              );
              if (!alreadyRead) {
                return {
                  ...msg,
                  readBy: [...existingReadBy, { userId, readAt: new Date() }],
                };
              }
            }
            return msg;
          })
        );
      }
    );

    socket.on(
      "reaction-added",
      ({
        messageId,
        reaction,
      }: {
        messageId: string;
        reaction: {
          id: string;
          emoji: string;
          userId: string;
          user: { id: string; name: string; avatar?: string };
        };
      }) => {
        // Only update if the reaction is from another user
        if (reaction.userId !== currentUserId) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                const existingReactions = msg.reactions || [];
                return {
                  ...msg,
                  reactions: [...existingReactions, reaction],
                };
              }
              return msg;
            })
          );
        }
      }
    );

    socket.on(
      "reaction-removed",
      ({
        messageId,
        emoji,
        userId,
      }: {
        messageId: string;
        emoji: string;
        userId: string;
      }) => {
        // Only update if the reaction removal is from another user
        if (userId !== currentUserId) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                const updatedReactions = (msg.reactions || []).filter(
                  (r) => !(r.emoji === emoji && r.userId === userId)
                );
                return {
                  ...msg,
                  reactions: updatedReactions,
                };
              }
              return msg;
            })
          );
        }
      }
    );

    return () => {
      socket.off("receive-message");
      socket.off("incoming-voice-call");
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-rejected");
      socket.off("call-cancelled");
      socket.off("user-typing");
      socket.off("user-stopped-typing");
      socket.off("messages-read");
      socket.off("reaction-added");
      socket.off("reaction-removed");
    };
  }, [socket, groupId, currentUserId]);

  const handleInitiateCall = async (callType: "video" | "audio") => {
    if (!socket || !group) return;

    const callId = `call-${Date.now()}`;
    setCurrentCallId(callId);

    // Get other members in the group/chat
    const otherMembers = group.members.filter(
      (m) => m.user.id !== currentUserId
    );

    // Create call record in database
    try {
      await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId,
          groupId,
          type: callType,
          participantIds: otherMembers.map((m) => m.user.id),
          isGroupCall: group.members.length > 2,
        }),
      });
    } catch (error) {
      console.error("Failed to create call record:", error);
    }

    // Emit incoming call to other members
    otherMembers.forEach((member) => {
      socket.emit("initiate-call", {
        to: member.user.id,
        from: currentUserId,
        fromName: currentUserName,
        callType,
        callId,
        groupId,
      });
    });

    // Show call UI for initiator
    if (callType === "video") {
      setIsVideoCallActive(true);
      setIsCallInitiator(true);
      setOtherUserId(otherMembers[0]?.user.id || null);
    } else {
      setIsVoiceCallActive(true);
      setIsCallInitiator(true);
      setOtherUserId(otherMembers[0]?.user.id || null);
    }
  };

  const handleAcceptCall = () => {
    if (!incomingCall || !socket) return;

    // Set call start time
    setCallStartTime(new Date());
    setCurrentCallId(incomingCall.callId);

    // Notify the caller that call was accepted
    socket.emit("accept-call", {
      callId: incomingCall.callId,
      groupId,
      acceptedBy: currentUserId,
    });

    // Start the call as receiver (not initiator)
    if (incomingCall.callType === "video") {
      setIsVideoCallActive(true);
      setIsCallInitiator(false);
      setOtherUserId(incomingCall.from);
    } else {
      setIsVoiceCallActive(true);
      setIsCallInitiator(false);
      setOtherUserId(incomingCall.from);
    }

    setIncomingCall(null);
  };

  const handleRejectCall = async () => {
    if (!incomingCall || !socket) return;

    // Update call record to rejected with 0 duration
    try {
      await fetch(`/api/calls/${incomingCall.callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          endedAt: new Date().toISOString(),
          duration: 0,
        }),
      });
    } catch (error) {
      console.error("Failed to update call record:", error);
    }

    // Notify the caller that call was rejected
    socket.emit("reject-call", {
      callId: incomingCall.callId,
      groupId,
      rejectedBy: currentUserId,
    });

    setIncomingCall(null);
  };

  const handleSendMessage = async (
    content: string,
    file?: { fileUrl: string; fileName: string; fileType: string }
  ) => {
    try {
      const messageData = file
        ? {
            groupId,
            content: content || "",
            type: file.fileType.startsWith("image/")
              ? "image"
              : file.fileType.startsWith("audio/")
              ? "voice"
              : "file",
            fileUrl: file.fileUrl,
            fileName: file.fileName,
            fileType: file.fileType,
            replyToId: replyTo?.id,
          }
        : { groupId, content, replyToId: replyTo?.id };

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const newMessage = await response.json();

      if (newMessage.error) {
        setAlertDialog({
          isOpen: true,
          message: `Error: ${newMessage.error}`,
          type: "error",
          onClose: () =>
            setAlertDialog({ isOpen: false, message: "", type: "error" }),
        });
        return;
      }

      socket?.emit("send-message", {
        groupId,
        ...newMessage,
      });

      // Clear reply after sending
      setReplyTo(null);
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        message: `Unable to send message. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        type: "error",
        onClose: () =>
          setAlertDialog({ isOpen: false, message: "", type: "error" }),
      });
    }
  };

  const handleTyping = () => {
    socket?.emit("typing-start", {
      groupId,
      userId: currentUserId,
      userName: currentUserName,
    });
  };

  const handleStopTyping = () => {
    socket?.emit("typing-stop", { groupId, userId: currentUserId });
  };

  const handleMessageVisible = async (messageId: string) => {
    if (!messageId) return;

    try {
      await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });

      socket?.emit("mark-messages-read", {
        groupId,
        messageIds: [messageId],
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const handleReactionAdd = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (!response.ok) {
        throw new Error("Failed to add reaction");
      }

      const data = await response.json();

      if (data.action === "added") {
        // Emit socket event for real-time update
        socket?.emit("add-reaction", {
          groupId,
          messageId,
          reaction: data.reaction,
        });

        // Update local state
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              const existingReactions = msg.reactions || [];
              return {
                ...msg,
                reactions: [...existingReactions, data.reaction],
              };
            }
            return msg;
          })
        );
      } else if (data.action === "removed") {
        // Emit socket event for removal
        socket?.emit("remove-reaction", {
          groupId,
          messageId,
          reactionId: data.reaction.id,
          emoji: data.reaction.emoji,
          userId: data.reaction.userId,
        });

        // Update local state
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              const updatedReactions = (msg.reactions || []).filter(
                (r) =>
                  !(
                    r.emoji === data.reaction.emoji &&
                    r.userId === data.reaction.userId
                  )
              );
              return {
                ...msg,
                reactions: updatedReactions,
              };
            }
            return msg;
          })
        );
      }
    } catch (error) {
      console.error("Failed to handle reaction:", error);
    }
  };

  const handleStartVoiceCall = () => {
    setIsVoiceCallActive(true);
    socket?.emit("start-voice-call", { groupId });
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/messages/search?groupId=${groupId}&query=${encodeURIComponent(
          query
        )}`
      );
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleDeleteGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete group");
      }

      setAlertDialog({
        isOpen: true,
        message: "Group deleted successfully",
        type: "success",
        onClose: () => {
          setAlertDialog({ isOpen: false, message: "", type: "success" });
          router.push("/");
        },
      });
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        message: `Unable to delete group. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        type: "error",
        onClose: () => {
          setAlertDialog({ isOpen: false, message: "", type: "error" });
          router.push("/");
        },
      });
    }
  };

  const isAdmin = group?.adminId === currentUserId;

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: currentThemeConfig.pattern || undefined }}
    >
      <div
        className={`${currentThemeConfig.bg} ${
          currentThemeConfig.pattern ? "bg-blend-overlay" : ""
        } flex-1 flex flex-col`}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/chat")}
              className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition-colors"
              title="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">
                  {group?.name || "Loading..."}
                </h1>
                {group?.description && (
                  <p className="text-sm text-green-100 truncate">
                    {group.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowThemeSelector(true)}
                className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition-colors"
                title="Change theme"
              >
                <Palette className="w-5 h-5" />
              </button>
              {group?.isOneToOne && (
                <button
                  onClick={() => handleInitiateCall("audio")}
                  className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition-colors"
                  title="Start voice call"
                >
                  <Phone className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => handleInitiateCall("video")}
                className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition-colors"
                title="Start video call"
              >
                <Video className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition-colors"
                title="Search messages"
              >
                <Search className="w-5 h-5" />
              </button>
              {!group?.isOneToOne && (
                <button
                  onClick={() => setShowMembers(true)}
                  className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition-colors"
                  title="View members"
                >
                  <Users className="w-5 h-5" />
                </button>
              )}
              {isAdmin && !group?.isOneToOne && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 hover:bg-red-600 rounded-full transition-colors"
                  title="Delete group"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="mt-3 px-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full px-4 py-2 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:outline-none"
              />
              {searchResults.length > 0 && (
                <div className="mt-2 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        const element = document.querySelector(
                          `[data-message-id="${result.id}"]`
                        );
                        element?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                        setShowSearch(false);
                      }}
                    >
                      <p className="text-xs font-semibold text-indigo-600">
                        {result.sender.name}
                      </p>
                      <p className="text-sm text-gray-900 truncate">
                        {result.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            groupMembers={group?.members}
            onMessageVisible={handleMessageVisible}
            onReactionAdd={handleReactionAdd}
            onReply={handleReply}
          />
          {Object.keys(typingUsers).length > 0 && (
            <div className="px-6 py-2 text-sm text-gray-500 italic">
              {Object.values(typingUsers)[0]} typing
              <span className="typing-dots">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </span>
            </div>
          )}
        </div>

        <MessageInput
          onSendMessage={handleSendMessage}
          onStartVoiceCall={handleStartVoiceCall}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
          groupId={groupId}
        />

        {isVoiceCallActive && otherUserId && (
          <VoiceCall
            socket={socket}
            groupId={groupId}
            userId={currentUserId}
            otherUserId={otherUserId}
            isInitiator={isCallInitiator}
            onClose={async () => {
              // Calculate duration and update call record
              if (currentCallId) {
                if (callStartTime) {
                  // Call was accepted, calculate actual duration
                  const endTime = new Date();
                  const duration = Math.floor(
                    (endTime.getTime() - callStartTime.getTime()) / 1000
                  );

                  try {
                    await fetch(`/api/calls/${currentCallId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        status: "ended",
                        endedAt: endTime.toISOString(),
                        duration,
                      }),
                    });
                  } catch (error) {
                    console.error("Failed to update call record:", error);
                  }
                } else {
                  // Call was cancelled before being accepted (missed)
                  try {
                    await fetch(`/api/calls/${currentCallId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        status: "missed",
                        endedAt: new Date().toISOString(),
                        duration: 0,
                      }),
                    });
                  } catch (error) {
                    console.error("Failed to update call record:", error);
                  }
                }
              }

              setIsVoiceCallActive(false);
              setOtherUserId(null);
              setIsCallInitiator(false);
              setCurrentCallId(null);
              setCallStartTime(null);
            }}
          />
        )}

        {isVideoCallActive && group && (
          <VideoCall
            socket={socket}
            groupId={groupId}
            userId={currentUserId}
            userName={currentUserName}
            isGroupCall={group.members.length > 2}
            onClose={() => setIsVideoCallActive(false)}
          />
        )}

        {/* Incoming Call */}
        {incomingCall && (
          <IncomingCall
            callerName={incomingCall.fromName}
            callType={incomingCall.callType}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        )}

        {/* Members Modal */}
        {showMembers && group && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowMembers(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {group.isOneToOne
                    ? "Chat Info"
                    : `Group Members (${group.members.length})`}
                </h2>
                <button
                  onClick={() => setShowMembers(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                <div className="space-y-3">
                  {group.members.map((member) => (
                    <div
                      key={member.user.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {member.user.name}
                          {member.user.id === group.adminId && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              Admin
                            </span>
                          )}
                          {member.user.id === currentUserId && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Delete Group?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this group? This action cannot
                be undone and all messages will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDeleteGroup();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Theme Selector Modal */}
        {showThemeSelector && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowThemeSelector(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Choose Chat Theme
                </h3>
                <button
                  onClick={() => setShowThemeSelector(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(themes).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => handleThemeChange(key)}
                    className={`relative rounded-xl overflow-hidden transition-all ${
                      currentTheme === key
                        ? "ring-4 ring-indigo-600 scale-105"
                        : "hover:scale-102 hover:shadow-lg"
                    }`}
                  >
                    <div
                      className={`h-32 ${theme.bg} flex items-center justify-center`}
                      style={{ backgroundImage: theme.pattern }}
                    >
                      <span className="text-lg font-semibold text-gray-800 bg-white/80 px-4 py-2 rounded-lg backdrop-blur-sm">
                        {theme.name}
                      </span>
                    </div>
                    {currentTheme === key && (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Your theme preference is saved
                  automatically for this chat.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alert Dialog */}
        <AlertDialog
          isOpen={alertDialog.isOpen}
          onClose={() => {
            if (alertDialog.onClose) {
              alertDialog.onClose();
            } else {
              setAlertDialog({ isOpen: false, message: "", type: "error" });
            }
          }}
          message={alertDialog.message}
          type={alertDialog.type}
        />
      </div>
    </div>
  );
}
