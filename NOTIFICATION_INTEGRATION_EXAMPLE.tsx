// Example: How to add notifications to your chat page
// Add this code to app/(dashboard)/chat/[groupId]/page.tsx

// 1. Import the notification hook at the top
import { useNotifications } from "@/contexts/NotificationContext";

// 2. Inside your component, get the showNotification function
export default function ChatPage() {
  const { showNotification } = useNotifications();
  
  // ... other code ...

  // 3. Add notification to your socket message handler
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on("message", (message) => {
      // Add message to state
      setMessages((prev) => [...prev, message]);

      // Show notification if message is from someone else
      if (message.sender.id !== currentUserId) {
        showNotification(
          message.sender.name, // Title
          message.content.substring(0, 100), // Body (first 100 chars)
          {
            icon: message.sender.avatar || "/logo.png", // User avatar
            data: {
              groupId: groupId,
              messageId: message.id,
              url: `/chat/${groupId}`, // URL to open when clicked
            },
          }
        );

        // Optional: Send push notification to server
        // This will notify user even if browser is closed
        if (message.sender.id !== currentUserId) {
          fetch("/api/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUserId, // The user to notify
              title: `${message.sender.name} sent a message`,
              body: message.content,
              icon: message.sender.avatar || "/logo.png",
              data: {
                url: `/chat/${groupId}`,
                groupId,
                messageId: message.id,
              },
            }),
          }).catch((err) => console.error("Failed to send push:", err));
        }
      }
    });

    return () => {
      socket.off("message");
    };
  }, [socket, currentUserId, groupId, showNotification]);

  // 4. For incoming calls - add to your call handler
  useEffect(() => {
    if (!socket) return;

    socket.on("incoming-call", (data) => {
      setIncomingCall({
        from: data.from,
        fromName: data.fromName,
        callType: data.callType,
        callId: data.callId,
      });

      // Show notification for incoming call
      showNotification(
        "Incoming Call",
        `${data.fromName} is calling...`,
        {
          icon: data.fromAvatar || "/logo.png",
          data: {
            callId: data.callId,
            callType: data.callType,
          },
        }
      );

      // Play ringtone (if you have audio setup)
      // const audio = new Audio("/notification.mp3");
      // audio.play();
    });

    return () => {
      socket.off("incoming-call");
    };
  }, [socket, showNotification]);

  return (
    // ... your JSX ...
  );
}

// 5. Optional: Add a notification permission button to your header
// Add this inside your JSX where you have other header buttons

import { Bell, BellOff } from "lucide-react";

function HeaderNotificationButton() {
  const { requestPermission, permission, isPushEnabled, subscribeToPush } = useNotifications();
  
  const handleClick = async () => {
    if (permission === "default") {
      await requestPermission();
    } else if (permission === "granted" && !isPushEnabled) {
      await subscribeToPush();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      title={
        permission === "default"
          ? "Enable notifications"
          : permission === "granted"
          ? isPushEnabled
            ? "Notifications enabled"
            : "Enable push notifications"
          : "Notifications blocked"
      }
    >
      {permission === "granted" && isPushEnabled ? (
        <Bell className="w-5 h-5 text-green-600" />
      ) : (
        <BellOff className="w-5 h-5 text-gray-500" />
      )}
    </button>
  );
}

// Then add <HeaderNotificationButton /> to your header component
