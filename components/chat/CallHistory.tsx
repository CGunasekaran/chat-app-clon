"use client";

import { useEffect, useState } from "react";
import {
  Video,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Clock,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface Call {
  id: string;
  type: string;
  status: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  isGroupCall: boolean;
  recordingUrl?: string;
  quality?: string;
  initiator: {
    id: string;
    name: string;
    avatar?: string;
  };
  group?: {
    id: string;
    name: string;
  };
  participants: Array<{
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
  }>;
}

interface CallHistoryProps {
  groupId?: string;
  onStartCall?: (type: "video" | "audio") => void;
}

export default function CallHistory({
  groupId,
  onStartCall,
}: CallHistoryProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const fetchCallHistory = async () => {
    try {
      const url = groupId ? `/api/calls?groupId=${groupId}` : "/api/calls";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCalls(data);
      }
    } catch (error) {
      console.error("Error fetching call history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCallIcon = (call: Call) => {
    if (call.type === "video") {
      return <Video className="w-5 h-5" />;
    }
    return <Phone className="w-5 h-5" />;
  };

  const getCallStatusIcon = (status: string) => {
    switch (status) {
      case "ended":
        return <PhoneIncoming className="w-4 h-4 text-green-500" />;
      case "missed":
        return <PhoneMissed className="w-4 h-4 text-red-500" />;
      case "rejected":
        return <PhoneOff className="w-4 h-4 text-red-500" />;
      default:
        return <Phone className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCallStatusText = (status: string) => {
    switch (status) {
      case "ended":
        return "Completed";
      case "missed":
        return "Missed";
      case "rejected":
        return "Declined";
      case "active":
        return "Active";
      default:
        return "Initiated";
    }
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case "ended":
        return "text-green-600";
      case "missed":
      case "rejected":
        return "text-red-600";
      case "active":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const downloadRecording = (url: string, callId: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-recording-${callId}.webm`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600">No call history yet</p>
        {onStartCall && (
          <div className="mt-4 flex gap-2 justify-center">
            <button
              onClick={() => onStartCall("video")}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Start Video Call
            </button>
            <button
              onClick={() => onStartCall("audio")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Start Audio Call
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calls.map((call) => (
        <div
          key={call.id}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            {/* Call Icon */}
            <div
              className={`p-2 rounded-full ${
                call.type === "video"
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {getCallIcon(call)}
            </div>

            {/* Call Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 truncate">
                  {call.isGroupCall
                    ? call.group?.name || "Group Call"
                    : call.initiator.name}
                </h4>
                {getCallStatusIcon(call.status)}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className={getCallStatusColor(call.status)}>
                  {getCallStatusText(call.status)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(call.startedAt), "MMM d, h:mm a")}
                </span>
                {call.duration && <span>{formatDuration(call.duration)}</span>}
              </div>

              {call.isGroupCall && (
                <div className="mt-2 text-sm text-gray-500">
                  {call.participants.length} participants
                </div>
              )}

              {call.quality && (
                <div className="mt-2 inline-block">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      call.quality === "excellent"
                        ? "bg-green-100 text-green-700"
                        : call.quality === "good"
                        ? "bg-blue-100 text-blue-700"
                        : call.quality === "fair"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {call.quality} quality
                  </span>
                </div>
              )}
            </div>

            {/* Recording Download */}
            {call.recordingUrl && (
              <button
                onClick={() => downloadRecording(call.recordingUrl!, call.id)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download recording"
              >
                <Download className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
