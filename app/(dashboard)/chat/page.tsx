"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  MessageCircle,
  Users,
  Plus,
  LogOut,
  User,
  ChevronDown,
  X,
  Shield,
  Search,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import AlertDialog from "@/components/ui/AlertDialog";

interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  updatedAt: Date;
  isOneToOne?: boolean;
  messages?: Array<{
    id: string;
    content: string;
    type?: string;
    createdAt: Date;
    sender: {
      id: string;
      name: string;
    };
  }>;
  members: Array<{
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
  }>;
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function ChatDashboard() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    isAdmin?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  // Generate consistent color based on string
  const getColorFromString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "from-blue-400 to-blue-600",
      "from-green-400 to-green-600",
      "from-purple-400 to-purple-600",
      "from-pink-400 to-pink-600",
      "from-indigo-400 to-indigo-600",
      "from-red-400 to-red-600",
      "from-yellow-400 to-yellow-600",
      "from-teal-400 to-teal-600",
      "from-orange-400 to-orange-600",
      "from-cyan-400 to-cyan-600",
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  // Get first letter of name
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCreateGroup) setShowCreateGroup(false);
        if (showUserProfile) setShowUserProfile(false);
        if (showUserSearch) setShowUserSearch(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showCreateGroup, showUserProfile, showUserSearch]);

  // Search users
  useEffect(() => {
    if (!showUserSearch) {
      setUserSearchQuery("");
      setSearchResults([]);
      return;
    }

    if (userSearchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/users?search=${encodeURIComponent(userSearchQuery)}`
        );
        if (response.ok) {
          const users = await response.json();
          setSearchResults(users);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery, showUserSearch]);

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
        loadGroups();
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
  }, [router]);

  const loadGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to load groups: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setGroups(data);
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        message: `Unable to load groups. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create group");
      }

      const newGroup = await response.json();
      if (newGroup.error) {
        throw new Error(newGroup.error);
      }

      setGroups([...groups, newGroup]);
      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupDescription("");
      router.push(`/chat/${newGroup.id}`);
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        message: `Unable to create group. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        type: "error",
        onClose: () =>
          setAlertDialog({ isOpen: false, message: "", type: "error" }),
      });
    }
  };

  const handleStartChat = async (otherUserId: string) => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start chat");
      }

      const chat = await response.json();
      setShowUserSearch(false);
      setUserSearchQuery("");
      setSearchResults([]);
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      setAlertDialog({
        isOpen: true,
        message: `Unable to start chat. ${
          error instanceof Error ? error.message : "Please try again."
        }`,
        type: "error",
        onClose: () =>
          setAlertDialog({ isOpen: false, message: "", type: "error" }),
      });
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              <h1 className="text-lg font-semibold">Chat App</h1>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
            </div>
            <button
              onClick={() => setShowUserProfile(true)}
              className="p-2 hover:from-indigo-700 hover:to-purple-700 rounded-full transition"
              title="View Profile"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full hover:from-green-700 hover:to-emerald-700 transition"
                  title="New Chat"
                >
                  <UserPlus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 transition"
                  title="Create Group"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No chats yet</p>
                <p className="text-sm mt-1">Start a chat or create a group</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/chat/${group.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 bg-gradient-to-br ${getColorFromString(
                          group.name
                        )} rounded-full flex items-center justify-center flex-shrink-0 relative`}
                      >
                        {group.isOneToOne ? (
                          <>
                            <span className="text-white font-bold text-lg">
                              {getInitial(group.name)}
                            </span>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                              <User className="w-3 h-3 text-gray-600" />
                            </div>
                          </>
                        ) : (
                          <>
                            <Users className="w-6 h-6 text-white" />
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {group.name}
                        </h3>
                        {group.messages && group.messages.length > 0 ? (
                          <p className="text-sm text-gray-500 truncate">
                            {group.messages[0].sender.name}:{" "}
                            {group.messages[0].type === "voice"
                              ? "🎤 Voice message"
                              : group.messages[0].type === "file"
                              ? "📎 File"
                              : group.messages[0].content}
                          </p>
                        ) : group.description ? (
                          <p className="text-sm text-gray-500 truncate">
                            {group.description}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic truncate">
                            No messages yet
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome to Chat App
          </h2>
          <p className="text-gray-600">
            Select a group to start messaging or create a new one
          </p>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowCreateGroup(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Create New Group
            </h3>
            <form onSubmit={handleCreateGroup}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter group description"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName("");
                    setNewGroupDescription("");
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Search Modal */}
      {showUserSearch && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowUserSearch(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">New Chat</h3>
              <button
                onClick={() => setShowUserSearch(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder:text-gray-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {userSearchQuery.trim() === "" ? (
                    <>
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Type to search users</p>
                    </>
                  ) : (
                    <>
                      <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No users found</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((searchUser) => (
                    <button
                      key={searchUser.id}
                      onClick={() => handleStartChat(searchUser.id)}
                      className="w-full p-3 rounded-lg hover:bg-gray-100 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 bg-gradient-to-br ${getColorFromString(
                            searchUser.name
                          )} rounded-full flex items-center justify-center flex-shrink-0 relative`}
                        >
                          <span className="text-white font-bold text-sm">
                            {getInitial(searchUser.name)}
                          </span>
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md">
                            <User className="w-2.5 h-2.5 text-gray-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {searchUser.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {searchUser.email}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfile && user && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowUserProfile(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Profile</h2>
              <button
                onClick={() => setShowUserProfile(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center mb-4">
                  <User className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {user.name}
                </h3>
                <p className="text-gray-600 mb-6">{user.email}</p>

                <div className="w-full bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      Name
                    </span>
                    <span className="text-sm text-gray-900 font-medium">
                      {user.name}
                    </span>
                  </div>
                  <div className="border-t border-gray-200"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      Email
                    </span>
                    <span className="text-sm text-gray-900 font-medium">
                      {user.email}
                    </span>
                  </div>
                  <div className="border-t border-gray-200"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      Groups
                    </span>
                    <span className="text-sm text-gray-900 font-medium">
                      {groups.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 w-full">
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setShowUserProfile(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
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
