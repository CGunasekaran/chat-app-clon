"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Check, CheckCheck, Download, FileText } from "lucide-react";

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
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  groupMembers?: Array<{ user: { id: string; name: string } }>;
  onMessageVisible?: (messageId: string) => void;
}

export default function MessageList({
  messages,
  currentUserId,
  groupMembers = [],
  onMessageVisible,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
                          <p className="text-sm break-words">
                            {message.content}
                          </p>
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
                        <p className="text-sm break-words mt-2">
                          {message.content}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Text Message */}
                  {!isImage && !isFile && (
                    <div className="p-3">
                      <p className="text-sm break-words">{message.content}</p>
                    </div>
                  )}
                </div>

                {/* Time and Read Receipt */}
                <div
                  className={`flex items-center gap-1 mt-1 px-1 ${
                    isOwn ? "justify-end" : ""
                  }`}
                >
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
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
