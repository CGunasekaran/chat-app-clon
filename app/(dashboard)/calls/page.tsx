"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Video,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Clock,
  Download,
  ArrowLeft,
  Filter,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

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

type FilterType = "all" | "video" | "audio" | "missed";

export default function CallHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    isAdmin?: boolean;
  } | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [stats, setStats] = useState({
    total: 0,
    video: 0,
    audio: 0,
    missed: 0,
    totalDuration: 0,
  });

  const calculateStats = (callData: Call[]) => {
    const stats = {
      total: callData.length,
      video: callData.filter((c) => c.type === "video").length,
      audio: callData.filter((c) => c.type === "audio").length,
      missed: callData.filter((c) => c.status === "missed").length,
      totalDuration: callData
        .filter((c) => c.duration)
        .reduce((sum, c) => sum + (c.duration || 0), 0),
    };
    setStats(stats);
  };

  const fetchCallHistory = async () => {
    try {
      const response = await fetch("/api/calls");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setCalls(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error("Error fetching call history:", error);
    }
  };

  const applyFilter = () => {
    let filtered = calls;

    switch (filter) {
      case "video":
        filtered = calls.filter((c) => c.type === "video");
        break;
      case "audio":
        filtered = calls.filter((c) => c.type === "audio");
        break;
      case "missed":
        filtered = calls.filter((c) => c.status === "missed");
        break;
      default:
        filtered = calls;
    }

    setFilteredCalls(filtered);
  };

  useEffect(() => {
    // Check authentication
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
        if (!data || !data.user || Object.keys(data).length === 0) {
          router.push("/login");
          return;
        }
        setUser(data.user);
        setLoading(false);
        fetchCallHistory();
      })
      .catch((error) => {
        console.error("Authentication error:", error);
        router.push("/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, calls]);

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

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const downloadRecording = (url: string, callId: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-recording-${callId}.webm`;
    a.click();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorForName = (name: string) => {
    const colors = [
      "bg-gradient-to-br from-pink-500 to-rose-500",
      "bg-gradient-to-br from-purple-500 to-indigo-500",
      "bg-gradient-to-br from-blue-500 to-cyan-500",
      "bg-gradient-to-br from-green-500 to-emerald-500",
      "bg-gradient-to-br from-yellow-500 to-orange-500",
      "bg-gradient-to-br from-red-500 to-pink-500",
    ];
    const index =
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/chat"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Call History
                </h1>
                <p className="text-sm text-gray-600">{user?.name || "User"}</p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Calls</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Phone className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Video Calls</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.video}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Video className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Missed Calls</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.missed}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <PhoneMissed className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Duration</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatTotalDuration(stats.totalDuration)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("video")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filter === "video"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Video className="w-4 h-4" />
                Video
              </button>
              <button
                onClick={() => setFilter("audio")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filter === "audio"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Phone className="w-4 h-4" />
                Audio
              </button>
              <button
                onClick={() => setFilter("missed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filter === "missed"
                    ? "bg-gradient-to-r from-red-600 to-pink-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <PhoneMissed className="w-4 h-4" />
                Missed
              </button>
            </div>
          </div>
        </div>

        {/* Call List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredCalls.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg font-medium">
                No calls found
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {filter !== "all"
                  ? `No ${filter} calls in your history`
                  : "Start making calls to see your history here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCalls.map((call) => (
                <div
                  key={call.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getColorForName(
                        call.isGroupCall
                          ? call.group?.name || "Group"
                          : call.initiator.name
                      )}`}
                    >
                      {call.isGroupCall ? (
                        <Users className="w-6 h-6" />
                      ) : (
                        getInitials(call.initiator.name)
                      )}
                    </div>

                    {/* Call Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {call.isGroupCall
                            ? call.group?.name || "Group Call"
                            : call.initiator.name}
                        </h3>
                        <div
                          className={`p-2 rounded-full ${
                            call.type === "video"
                              ? "bg-indigo-100 text-indigo-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {getCallIcon(call)}
                        </div>
                        {getCallStatusIcon(call.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span
                          className={`font-medium ${getCallStatusColor(
                            call.status
                          )}`}
                        >
                          {getCallStatusText(call.status)}
                        </span>
                        <span className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          {format(
                            new Date(call.startedAt),
                            "MMM d, yyyy"
                          )} at {format(new Date(call.startedAt), "h:mm a")}
                        </span>
                        {call.duration && (
                          <span className="text-gray-600 font-medium">
                            Duration: {formatDuration(call.duration)}
                          </span>
                        )}
                      </div>

                      {call.isGroupCall && (
                        <div className="mt-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {call.participants.length} participants
                          </span>
                          <div className="flex -space-x-2">
                            {call.participants
                              .slice(0, 3)
                              .map((participant) => (
                                <div
                                  key={participant.user.id}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white ${getColorForName(
                                    participant.user.name
                                  )}`}
                                  title={participant.user.name}
                                >
                                  {getInitials(participant.user.name)}
                                </div>
                              ))}
                            {call.participants.length > 3 && (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-700 text-xs font-semibold border-2 border-white">
                                +{call.participants.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {call.quality && (
                        <div className="mt-3">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              call.quality === "excellent"
                                ? "bg-green-100 text-green-700"
                                : call.quality === "good"
                                ? "bg-blue-100 text-blue-700"
                                : call.quality === "fair"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {call.quality.charAt(0).toUpperCase() +
                              call.quality.slice(1)}{" "}
                            quality
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Recording Download */}
                    {call.recordingUrl && (
                      <button
                        onClick={() =>
                          downloadRecording(call.recordingUrl!, call.id)
                        }
                        className="p-3 hover:bg-indigo-50 rounded-lg transition-colors group"
                        title="Download recording"
                      >
                        <Download className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
