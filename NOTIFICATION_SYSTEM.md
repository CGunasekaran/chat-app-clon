# Notification System Implementation Guide

## ✅ What's Been Implemented

### 1. **Dependencies Installed**
- `react-hot-toast` - For in-app toast notifications
- `web-push` - For push notifications

### 2. **Core Components Created**

#### **Notification Context** (`contexts/NotificationContext.tsx`)
- Manages notification permissions
- Handles browser notifications
- Manages push notification subscriptions  
- Shows in-app toast notifications

#### **Service Worker** (`public/sw.js`)
- Handles background push notifications
- Shows notifications when app is closed
- Manages notification clicks

#### **Notification Settings Component** (`components/notifications/NotificationSettings.tsx`)
- UI for enabling/disabling notifications
- Permission request buttons
- Push notification toggle
- Sound preferences

### 3. **API Endpoints**

- `POST /api/push/subscribe` - Save push subscription
- `POST /api/push/unsubscribe` - Remove push subscription  
- `POST /api/push/send` - Send push notification to user

### 4. **Database Schema**
Added `PushSubscription` model to store user devices

---

## 🔑 VAPID Keys (Add to Environment Variables)

Add these to your `.env.local` file and Vercel environment variables:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BBEQSmXvvReLidsyugnxdoa-VPxaXjvEPRF_PGg4rmZ2K766NGJA7MqBnJvvImW1VSLompxBiaR84FrMrndREc0
VAPID_PRIVATE_KEY=CgweSUDCZdvF9qyqtpZx17vy0vUsTkFR0RzFB_oZzT0
```

---

## 📝 How to Use Notifications

### **1. In Chat Page - Show Notification When Message Arrives**

```typescript
import { useNotifications } from "@/contexts/NotificationContext";

function ChatPage() {
  const { showNotification } = useNotifications();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on("message", (message) => {
      // Show in-app notification
      showNotification(
        message.sender.name,
        message.content,
        {
          icon: message.sender.avatar || "/default-avatar.png",
          data: { groupId, messageId: message.id },
        }
      );
      
      // Also send push notification to other users
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: recipientUserId,
          title: message.sender.name,
          body: message.content,
          icon: message.sender.avatar,
          data: { groupId, messageId: message.id },
        }),
      });
    });
  }, [socket]);
}
```

### **2. For Incoming Calls**

```typescript
// When incoming call arrives
showNotification(
  "Incoming Call",
  `${callerName} is calling...`,
  {
    icon: callerAvatar,
    data: { callId, callType: "voice" },
  }
);
```

### **3. Add Notification Settings to UI**

```typescript
import NotificationSettings from "@/components/notifications/NotificationSettings";

function SettingsPage() {
  return (
    <div>
      <h2>Settings</h2>
      <NotificationSettings />
    </div>
  );
}
```

---

## 🚀 Integration Steps

### **Step 1: Add Environment Variables**

1. Create `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BBEQSmXvvReLidsyugnxdoa-VPxaXjvEPRF_PGg4rmZ2K766NGJA7MqBnJvvImW1VSLompxBiaR84FrMrndREc0
VAPID_PRIVATE_KEY=CgweSUDCZdvF9qyqtpZx17vy0vUsTkFR0RzFB_oZzT0
```

2. Add to Vercel:
   - Go to Settings → Environment Variables
   - Add both variables for Production, Preview, Development

### **Step 2: Update Chat Page**

Add this to your chat page (`app/(dashboard)/chat/[groupId]/page.tsx`):

```typescript
import { useNotifications } from "@/contexts/NotificationContext";

// Inside component
const { showNotification } = useNotifications();

// In socket message handler
useEffect(() => {
  if (!socket) return;
  
  socket.on("message", (message) => {
    setMessages((prev) => [...prev, message]);
    
    // Show notification if message is from someone else
    if (message.sender.id !== currentUserId) {
      showNotification(
        message.sender.name,
        message.content.substring(0, 100),
        {
          icon: message.sender.avatar || "/logo.png",
        }
      );
    }
  });
  
  return () => {
    socket.off("message");
  };
}, [socket, currentUserId, showNotification]);
```

### **Step 3: Add Notification Bell to Header**

Create a notification bell icon in your chat header:

```typescript
import { Bell } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

function ChatHeader() {
  const { requestPermission, permission } = useNotifications();
  
  return (
    <header>
      {/* Other header content */}
      
      {permission === "default" && (
        <button
          onClick={requestPermission}
          className="p-2 hover:bg-gray-100 rounded-full"
          title="Enable notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
      )}
    </header>
  );
}
```

### **Step 4: Update Prisma and Deploy**

```bash
# Update database
npx prisma db push

# Commit changes
git add .
git commit -m "Add notification system"
git push
```

---

## 🎯 Features

### **In-App Notifications**
✅ Toast notifications appear when messages arrive  
✅ Custom styling with sender avatar  
✅ Auto-dismiss after 5 seconds  
✅ Click to dismiss manually

### **Browser Notifications**
✅ Show notifications when tab is in background  
✅ Permission request UI  
✅ Custom icon and message preview

### **Push Notifications**
✅ Receive notifications when browser is closed  
✅ Background service worker  
✅ Notification click opens app  
✅ Subscribe/unsubscribe management

---

## 🔧 Testing

### **Local Testing:**

1. Run the app: `npm run dev`
2. Open chat page
3. Click notification permission button
4. Send a message from another user
5. You should see:
   - In-app toast notification (when tab is active)
   - Browser notification (when tab is inactive)

### **Push Notification Testing:**

1. Enable push notifications in settings
2. Close the browser completely
3. Send notification via API:
```bash
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-email",
    "title": "Test Notification",
    "body": "This is a test",
    "icon": "/logo.png"
  }'
```

---

## 📱 Browser Compatibility

| Browser | In-App | Browser Notifications | Push Notifications |
|---------|--------|----------------------|-------------------|
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Safari | ✅ | ✅ | ⚠️ Limited |
| Edge | ✅ | ✅ | ✅ |

---

## 🐛 Troubleshooting

### **Notifications not showing:**
- Check browser permission settings
- Ensure VAPID keys are set in environment variables
- Check browser console for errors

### **Push notifications not working:**
- Verify service worker is registered (`/sw.js`)
- Check if subscription was saved to database
- Ensure HTTPS in production (required for push)

### **Service worker errors:**
- Clear browser cache
- Unregister old service workers in DevTools → Application → Service Workers

---

Last Updated: December 25, 2024
