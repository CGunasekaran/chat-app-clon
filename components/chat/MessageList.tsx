"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export default function MessageList({
  messages,
  currentUserId,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

        return (
          <div
            key={message.id}
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

              <div>
                {!isOwn && (
                  <p className="text-xs font-semibold mb-1 text-gray-700 px-1">
                    {message.sender.name}
                  </p>
                )}
                <div
                  className={`rounded-lg p-3 ${
                    isOwn
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-900 shadow"
                  }`}
                >
                  <p className="text-sm break-words">{message.content}</p>
                </div>
                <p
                  className={`text-xs text-gray-500 mt-1 px-1 ${
                    isOwn ? "text-right" : ""
                  }`}
                >
                  {format(new Date(message.createdAt), "HH:mm")}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
