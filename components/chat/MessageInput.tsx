"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, X, Upload, Image, FileText } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (
    content: string,
    file?: {
      fileUrl: string;
      fileName: string;
      fileType: string;
      type: "image" | "file";
    }
  ) => void;
  onStartVoiceCall: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
}

export default function MessageInput({
  onSendMessage,
  onStartVoiceCall,
  onTyping,
  onStopTyping,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    url: string;
    type: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close file menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showFileMenu) {
        setShowFileMenu(false);
      }
    };

    if (showFileMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showFileMenu]);

  const handleTyping = (value: string) => {
    setMessage(value);

    // Start typing indicator
    if (value && !typingTimeoutRef.current) {
      onTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
      typingTimeoutRef.current = null;
    }, 3000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const isImage = file.type.startsWith("image/");
    const url = URL.createObjectURL(file);
    setPreviewFile({ name: file.name, url, type: file.type });

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      // Send message with file
      onSendMessage(message || (isImage ? "Image" : file.name), {
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        type: isImage ? "image" : "file",
      });

      // Clear
      setMessage("");
      setPreviewFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
      onStopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearPreview = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border-t bg-white">
      {/* File Preview */}
      {previewFile && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            {previewFile.type.startsWith("image/") ? (
              <img
                src={previewFile.url}
                alt="Preview"
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {previewFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {isUploading ? "Uploading..." : "Ready to send"}
              </p>
            </div>
            <button
              onClick={clearPreview}
              disabled={isUploading}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4">
        <div className="flex gap-2 items-center">
          {/* Hidden file inputs */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
            className="hidden"
          />

          {/* Input field with upload icon */}
          <div className="flex-1 relative flex items-center border rounded-full focus-within:border-indigo-500">
            <input
              type="text"
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isUploading}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 rounded-full focus:outline-none text-gray-900 disabled:bg-gray-100"
            />

            {/* File upload button inside textbox */}
            <div className="relative pr-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFileMenu(!showFileMenu);
                }}
                disabled={isUploading || !!previewFile}
                className="p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
                title="Share file"
              >
                <Upload className="w-5 h-5 text-indigo-600" />
              </button>

              {/* Dropdown menu */}
              {showFileMenu && !isUploading && !previewFile && (
                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[160px] z-10">
                  <button
                    onClick={() => {
                      imageInputRef.current?.click();
                      setShowFileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-indigo-50 flex items-center gap-3 text-gray-700"
                  >
                    <Image className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Share Image</span>
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowFileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-indigo-50 flex items-center gap-3 text-gray-700"
                  >
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm">Share Document</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onStartVoiceCall}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
            title="Start voice call"
          >
            <Mic className="w-5 h-5 text-gray-600" />
          </button>

          <button
            onClick={handleSend}
            disabled={!message.trim() || isUploading}
            className="p-2 rounded-full bg-indigo-600 hover:bg-gradient-to-r from-indigo-600 to-purple-600 disabled:bg-gray-300 transition"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
