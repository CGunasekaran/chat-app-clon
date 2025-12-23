"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  X,
  Upload,
  Image,
  FileText,
  Reply,
  Circle,
  AtSign,
} from "lucide-react";

interface ReplyMessage {
  id: string;
  content: string;
  type: string;
  sender: {
    name: string;
  };
}

interface MentionSuggestion {
  id: string;
  name: string;
  avatar: string | null;
}

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
  replyTo?: ReplyMessage | null;
  onCancelReply?: () => void;
  groupId: string;
}

export default function MessageInput({
  onSendMessage,
  onStartVoiceCall,
  onTyping,
  onStopTyping,
  replyTo,
  onCancelReply,
  groupId,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    url: string;
    type: string;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<
    MentionSuggestion[]
  >([]);
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect @ mentions
  useEffect(() => {
    const fetchMentions = async () => {
      if (mentionQuery !== null) {
        try {
          const response = await fetch(
            `/api/mentions?groupId=${groupId}&query=${encodeURIComponent(
              mentionQuery
            )}`
          );
          if (response.ok) {
            const suggestions = await response.json();
            setMentionSuggestions(suggestions);
            setShowMentions(suggestions.length > 0);
          }
        } catch (error) {
          console.error("Error fetching mentions:", error);
        }
      } else {
        setShowMentions(false);
        setMentionSuggestions([]);
      }
    };

    fetchMentions();
  }, [mentionQuery, groupId]);

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

    // Get cursor position
    const cursorPos = inputRef.current?.selectionStart || 0;
    setCursorPosition(cursorPos);

    // Detect @ mentions
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Check if there's no space after @
      if (!textAfterAt.includes(" ")) {
        setMentionQuery(textAfterAt);
        setSelectedMentionIndex(0);
      } else {
        setMentionQuery(null);
      }
    } else {
      setMentionQuery(null);
    }

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        await handleVoiceUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Update recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      audioChunksRef.current = [];
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleVoiceUpload = async (audioBlob: Blob) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", audioBlob, `voice-${Date.now()}.webm`);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      onSendMessage("", {
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: "audio/webm",
        type: "file",
      });
    } catch (error) {
      console.error("Voice upload error:", error);
      alert("Failed to send voice message");
    } finally {
      setIsUploading(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const insertMention = (suggestion: MentionSuggestion) => {
    const textBeforeCursor = message.slice(0, cursorPosition);
    const textAfterCursor = message.slice(cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    const newMessage =
      textBeforeCursor.slice(0, atIndex) +
      `@${suggestion.name} ` +
      textAfterCursor;

    setMessage(newMessage);
    setMentionQuery(null);
    setShowMentions(false);

    // Set focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = atIndex + suggestion.name.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Handle mention selection with arrow keys
    if (showMentions && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < mentionSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : mentionSuggestions.length - 1
        );
        return;
      } else if (e.key === "Enter") {
        e.preventDefault();
        insertMention(mentionSuggestions[selectedMentionIndex]);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        setShowMentions(false);
        return;
      }
    }

    // Normal Enter to send
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
      {/* Reply Preview */}
      {replyTo && (
        <div className="p-3 border-b bg-indigo-50 flex items-start gap-3">
          <Reply className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-600">
              Replying to {replyTo.sender.name}
            </p>
            <p className="text-sm text-gray-700 truncate">
              {replyTo.type === "voice" ? "🎤 Voice message" : replyTo.content}
            </p>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

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
            {/* Mention suggestions dropdown */}
            {showMentions && mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50">
                {mentionSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => insertMention(suggestion)}
                    className={`w-full px-4 py-2 text-left hover:bg-indigo-50 flex items-center gap-3 ${
                      index === selectedMentionIndex ? "bg-indigo-100" : ""
                    }`}
                  >
                    {suggestion.avatar ? (
                      <img
                        src={suggestion.avatar}
                        alt={suggestion.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                        {suggestion.id === "all" ? (
                          <AtSign className="w-4 h-4" />
                        ) : (
                          suggestion.name[0].toUpperCase()
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {suggestion.id === "all" ? "@all" : `@${suggestion.name}`}
                      </p>
                      {suggestion.id === "all" && (
                        <p className="text-xs text-gray-500">Notify everyone</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isUploading}
              placeholder="Type a message... (use @ to mention)"
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

          {/* Voice Recording or Send Button */}
          {isRecording ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full">
              <Circle className="w-3 h-3 text-red-600 animate-pulse fill-current" />
              <span className="text-sm text-red-600 font-medium">
                {formatRecordingTime(recordingTime)}
              </span>
              <button
                onClick={cancelRecording}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={stopRecording}
                className="ml-1 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition"
                title="Send voice message"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={startRecording}
                disabled={isUploading || !!message.trim()}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
                title="Record voice message"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
