"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import VoiceCall from "@/components/chat/VoiceCall";
import AlertDialog from "@/components/ui/AlertDialog";
import { ArrowLeft, Users, Trash2, X, Search } from "lucide-react";

interface Message {
  id: string;
  content: string;
  type?: string;
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
  const [group, setGroup] = useState<Group | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showMembers) setShowMembers(false);
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        if (showSearch) setShowSearch(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showMembers, showDeleteConfirm, showSearch]);

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
    if (!socket) return;

    socket.emit("join-group", groupId);

    socket.on("receive-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("incoming-voice-call", () => {
      setIsVoiceCallActive(true);
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
      socket.off("user-typing");
      socket.off("user-stopped-typing");
      socket.off("messages-read");
      socket.off("reaction-added");
      socket.off("reaction-removed");
    };
  }, [socket, groupId, currentUserId]);

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
    <div className="flex flex-col h-screen bg-gray-50">
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
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition-colors"
              title="Search messages"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowMembers(true)}
              className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition-colors"
              title="View members"
            >
              <Users className="w-5 h-5" />
            </button>
            {isAdmin && (
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
      />

      {isVoiceCallActive && (
        <VoiceCall
          socket={socket}
          onClose={() => setIsVoiceCallActive(false)}
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
                Group Members ({group.members.length})
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
              Are you sure you want to delete this group? This action cannot be
              undone and all messages will be permanently deleted.
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
  );
}
