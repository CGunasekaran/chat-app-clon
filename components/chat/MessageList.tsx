"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
  Check,
  CheckCheck,
  Download,
  FileText,
  Smile,
  Reply,
  Mic,
  Play,
  Pause,
} from "lucide-react";

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Mention {
  id: string;
  startIndex: number;
  length: number;
  isAll: boolean;
  userId: string | null;
  user: {
    id: string;
    name: string;
  } | null;
}

interface Message {
  id: string;
  content: string;
  type: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt: Date;
  isPriority?: boolean;
  hasMentions?: boolean;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;
  reactions?: Reaction[];
  mentions?: Mention[];
  replyTo?: {
    id: string;
    content: string;
    type: string;
    sender: {
      id: string;
      name: string;
    };
  };
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  groupMembers?: Array<{ user: { id: string; name: string } }>;
  onMessageVisible?: (messageId: string) => void;
  onReactionAdd?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
}

export default function MessageList({
  messages,
  currentUserId,
  groupMembers = [],
  onMessageVisible,
  onReactionAdd,
  onReply,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [pickerPosition, setPickerPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({});
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  const emojis = [
    "👍",
    "❤️",
    "😂",
    "😮",
    "😢",
    "🙏",
    "🔥",
    "🎉",
    "👏",
    "💯",
    "✨",
    "💪",
    "🤔",
    "😍",
    "🥳",
    "😎",
    "🤗",
    "👀",
    "💖",
    "⭐",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(null);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    // Set up intersection observer for read receipts
    if (onMessageVisible) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const messageId = entry.target.getAttribute("data-message-id");
              if (messageId) {
                onMessageVisible(messageId);
              }
            }
          });
        },
        { threshold: 0.5 }
      );
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [onMessageVisible]);

  const isMessageRead = (message: Message) => {
    if (!message.readBy) return false;
    return message.readBy.some((read) => read.userId !== currentUserId);
  };

  const getReadCount = (message: Message) => {
    if (!message.readBy) return 0;
    return message.readBy.filter((read) => read.userId !== currentUserId)
      .length;
  };

  const getReadByNames = (message: Message) => {
    if (!message.readBy || !groupMembers) return [];
    return message.readBy
      .filter((read) => read.userId !== currentUserId)
      .map((read) => {
        const member = groupMembers.find((m) => m.user.id === read.userId);
        return member ? member.user.name : "Unknown";
      });
  };

  const handleReactionClick = (messageId: string, emoji: string) => {
    if (onReactionAdd) {
      onReactionAdd(messageId, emoji);
    }
    setShowEmojiPicker(null);
  };

  const handleEmojiPickerToggle = (messageId: string, isOwn: boolean) => {
    if (showEmojiPicker === messageId) {
      setShowEmojiPicker(null);
      return;
    }

    const button = buttonRefs.current[messageId];
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const pickerWidth = 240; // mobile width
    const pickerHeight = 220; // approximate height with header
    const spacing = 8; // mb-2 = 8px

    // Check if there's enough space above
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showBelow = spaceAbove < pickerHeight + spacing;

    // Calculate horizontal position
    let position: typeof pickerPosition = {};

    if (showBelow) {
      // Show below the button
      position.top = rect.bottom + spacing;
    } else {
      // Show above the button
      position.bottom = window.innerHeight - rect.top + spacing;
    }

    // Align based on message ownership
    if (isOwn) {
      position.right = window.innerWidth - rect.right;
    } else {
      position.left = rect.left;
    }

    // Ensure picker stays within viewport
    if (
      position.left !== undefined &&
      position.left + pickerWidth > window.innerWidth
    ) {
      position.left = window.innerWidth - pickerWidth - 16;
    }
    if (
      position.right !== undefined &&
      position.right + pickerWidth > window.innerWidth
    ) {
      position.right = window.innerWidth - pickerWidth - 16;
    }

    setPickerPosition(position);
    setShowEmojiPicker(messageId);
  };

  const handleAudioToggle = (messageId: string) => {
    const audio = audioRefs.current[messageId];
    if (!audio) return;

    if (playingAudio === messageId) {
      audio.pause();
      setPlayingAudio(null);
    } else {
      // Pause any currently playing audio
      if (playingAudio) {
        const currentAudio = audioRefs.current[playingAudio];
        if (currentAudio) currentAudio.pause();
      }
      audio.play();
      setPlayingAudio(messageId);
    }

    audio.onended = () => setPlayingAudio(null);
  };

  const getReactionGroups = (reactions?: Reaction[]) => {
    if (!reactions) return [];
    const groups = new Map<string, Reaction[]>();
    reactions.forEach((reaction) => {
      const existing = groups.get(reaction.emoji) || [];
      groups.set(reaction.emoji, [...existing, reaction]);
    });
    return Array.from(groups.entries()).map(([emoji, reactions]) => ({
      emoji,
      count: reactions.length,
      users: reactions.map((r) => r.user),
      hasCurrentUser: reactions.some((r) => r.userId === currentUserId),
    }));
  };

  // Render message content with highlighted mentions
  const renderMessageContent = (message: Message) => {
    if (
      !message.hasMentions ||
      !message.mentions ||
      message.mentions.length === 0
    ) {
      return <p className="text-sm break-words">{message.content}</p>;
    }

    const parts: React.ReactElement[] = [];
    let lastIndex = 0;

    // Sort mentions by start index
    const sortedMentions = [...message.mentions].sort(
      (a, b) => a.startIndex - b.startIndex
    );

    sortedMentions.forEach((mention, idx) => {
      // Add text before mention
      if (mention.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {message.content.slice(lastIndex, mention.startIndex)}
          </span>
        );
      }

      // Add highlighted mention
      const mentionText = message.content.slice(
        mention.startIndex,
        mention.startIndex + mention.length
      );
      const isMentioned = mention.userId === currentUserId || mention.isAll;

      parts.push(
        <span
          key={`mention-${idx}`}
          className={`font-semibold rounded px-1 ${
            isMentioned ? "bg-indigo-100 text-indigo-700" : "text-indigo-600"
          }`}
          title={mention.isAll ? "Everyone" : mention.user?.name || "User"}
        >
          {mentionText}
        </span>
      );

      lastIndex = mention.startIndex + mention.length;
    });

    // Add remaining text
    if (lastIndex < message.content.length) {
      parts.push(
        <span key="text-end">{message.content.slice(lastIndex)}</span>
      );
    }

    return <p className="text-sm break-words">{parts}</p>;
  };

  if (!Array.isArray(messages)) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwn = message.sender.id === currentUserId;
        const isImage = message.type === "image" && message.fileUrl;
        const isFile = message.type === "file" && message.fileUrl;

        return (
          <div
            key={message.id}
            data-message-id={message.id}
            ref={(el) => {
              if (el && !isOwn && observerRef.current) {
                observerRef.current.observe(el);
              }
            }}
            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex gap-2 max-w-[70%] ${
                isOwn ? "flex-row-reverse" : ""
              }`}
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {message.sender.avatar ? (
                    <Image
                      src={message.sender.avatar}
                      alt={message.sender.name}
                      width={32}
                      height={32}
                      className="w-full h-full rounded-full"
                    />
                  ) : (
                    message.sender.name.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {!isOwn && (
                  <p className="text-xs font-semibold mb-1 text-gray-700 px-1">
                    {message.sender.name}
                  </p>
                )}
                <div
                  className={`rounded-lg overflow-hidden ${
                    isOwn
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-900 shadow"
                  }`}
                >
                  {/* Replied Message Preview */}
                  {message.replyTo && (
                    <div
                      className={`border-l-4 p-2 m-2 mb-0 ${
                        isOwn
                          ? "border-indigo-300 bg-indigo-500 bg-opacity-30"
                          : "border-gray-300 bg-gray-100"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold ${
                          isOwn ? "text-indigo-100" : "text-indigo-600"
                        }`}
                      >
                        {message.replyTo.sender.name}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          isOwn ? "text-indigo-100" : "text-gray-600"
                        }`}
                      >
                        {message.replyTo.type === "voice"
                          ? "🎤 Voice message"
                          : message.replyTo.content}
                      </p>
                    </div>
                  )}

                  {/* Voice Message */}
                  {message.type === "voice" && message.fileUrl && (
                    <div className="p-3 flex items-center gap-3">
                      <button
                        onClick={() => handleAudioToggle(message.id)}
                        className={`p-3 rounded-full transition ${
                          isOwn
                            ? "bg-indigo-700 hover:bg-indigo-800"
                            : "bg-indigo-100 hover:bg-indigo-200"
                        }`}
                      >
                        {playingAudio === message.id ? (
                          <Pause
                            className={`w-5 h-5 ${
                              isOwn ? "text-white" : "text-indigo-600"
                            }`}
                          />
                        ) : (
                          <Play
                            className={`w-5 h-5 ${
                              isOwn ? "text-white" : "text-indigo-600"
                            }`}
                          />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Mic
                            className={`w-4 h-4 ${
                              isOwn ? "text-indigo-200" : "text-gray-500"
                            }`}
                          />
                          <p
                            className={`text-xs ${
                              isOwn ? "text-indigo-200" : "text-gray-500"
                            }`}
                          >
                            Voice message
                          </p>
                        </div>
                      </div>
                      <audio
                        ref={(el) => {
                          if (el) audioRefs.current[message.id] = el;
                        }}
                        src={message.fileUrl}
                        preload="metadata"
                      />
                    </div>
                  )}

                  {/* Image Message */}
                  {isImage && (
                    <div className="relative">
                      <Image
                        src={message.fileUrl!}
                        alt={message.fileName || "Image"}
                        width={300}
                        height={200}
                        className="w-full h-auto max-h-80 object-cover cursor-pointer"
                        onClick={() => window.open(message.fileUrl, "_blank")}
                      />
                      {message.content && (
                        <div className="p-3">
                          {renderMessageContent(message)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* File Message */}
                  {isFile && (
                    <div className="p-3">
                      <a
                        href={message.fileUrl}
                        download={message.fileName}
                        className={`flex items-center gap-3 ${
                          isOwn ? "hover:bg-indigo-700" : "hover:bg-gray-50"
                        } p-2 rounded transition`}
                      >
                        <div
                          className={`p-2 rounded ${
                            isOwn ? "bg-indigo-700" : "bg-gray-100"
                          }`}
                        >
                          <FileText
                            className={`w-5 h-5 ${
                              isOwn ? "text-white" : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {message.fileName}
                          </p>
                          <p
                            className={`text-xs ${
                              isOwn ? "text-indigo-200" : "text-gray-500"
                            }`}
                          >
                            {message.fileType}
                          </p>
                        </div>
                        <Download
                          className={`w-4 h-4 ${
                            isOwn ? "text-white" : "text-gray-600"
                          }`}
                        />
                      </a>
                      {message.content && (
                        <div className="mt-2">
                          {renderMessageContent(message)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Message */}
                  {!isImage && !isFile && (
                    <div className="p-3">{renderMessageContent(message)}</div>
                  )}
                </div>

                {/* Reactions */}
                <div className="flex flex-wrap items-center gap-1 mt-2 px-1 max-w-full">
                  {getReactionGroups(message.reactions).map((group) => (
                    <button
                      key={group.emoji}
                      onClick={() =>
                        handleReactionClick(message.id, group.emoji)
                      }
                      className={`relative group flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition ${
                        group.hasCurrentUser
                          ? "bg-indigo-100 border border-indigo-300"
                          : "bg-gray-100 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-base">{group.emoji}</span>
                      <span className="font-medium text-gray-700 text-xs">
                        {group.count}
                      </span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                          {group.users.map((user, idx) => (
                            <p key={idx}>
                              {group.emoji} {user.name}
                            </p>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Add Reaction Button */}
                  <div className="relative flex-shrink-0">
                    <button
                      ref={(el) => {
                        if (el) buttonRefs.current[message.id] = el;
                      }}
                      onClick={() => handleEmojiPickerToggle(message.id, isOwn)}
                      className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-600"
                      title="Add reaction"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Time and Read Receipt */}
                <div
                  className={`flex items-center gap-2 mt-1 px-1 ${
                    isOwn ? "justify-end" : "justify-between"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-gray-500">
                      {format(new Date(message.createdAt), "HH:mm")}
                    </p>
                    {isOwn && (
                      <div className="relative group">
                        <span className="text-xs cursor-pointer">
                          {isMessageRead(message) ? (
                            <CheckCheck className="w-3 h-3 text-indigo-600" />
                          ) : (
                            <Check className="w-3 h-3 text-gray-400" />
                          )}
                        </span>
                        {isMessageRead(message) &&
                          getReadByNames(message).length > 0 && (
                            <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                <p className="font-semibold mb-1">Read by:</p>
                                {getReadByNames(message).map((name, idx) => (
                                  <p key={idx}>• {name}</p>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  {!isOwn && onReply && (
                    <button
                      onClick={() => onReply(message)}
                      className="text-gray-400 hover:text-indigo-600 transition p-1 rounded hover:bg-gray-100"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />

      {/* Fixed Position Emoji Picker */}
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-2.5 z-[100] w-[240px] sm:w-[260px]"
          style={{
            top: pickerPosition.top,
            bottom: pickerPosition.bottom,
            left: pickerPosition.left,
            right: pickerPosition.right,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">Add Reaction</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition p-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1 max-h-[160px] overflow-y-auto">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReactionClick(showEmojiPicker, emoji);
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xl sm:text-2xl hover:bg-gray-100 rounded-lg transition transform hover:scale-110"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
