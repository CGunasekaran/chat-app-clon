export const notificationSounds = {
  default: '/notification-default.mp3', // These would need to be added to public folder
  pop: '/notification-pop.mp3',
  chime: '/notification-chime.mp3',
  bell: '/notification-bell.mp3',
  none: null,
};

export interface NotificationOptions {
  sound: string;
  showPreview: boolean;
  isPriority: boolean;
  muteUntil: Date | null;
  onlyMentions: boolean;
  bundleMessages: boolean;
}

export class NotificationManager {
  private static instance: NotificationManager;
  private audio: HTMLAudioElement | null = null;
  private pendingNotifications: Array<{
    title: string;
    body: string;
    groupId: string;
    timestamp: number;
  }> = [];
  private bundleTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }

  isPermissionGranted(): boolean {
    return "Notification" in window && Notification.permission === "granted";
  }

  async playSound(soundName: string) {
    if (soundName === "none") return;

    const soundUrl = notificationSounds[soundName as keyof typeof notificationSounds];
    if (!soundUrl) return;

    try {
      // Stop previous sound if playing
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }

      this.audio = new Audio(soundUrl);
      await this.audio.play();
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }

  showNotification(
    title: string,
    body: string,
    options: NotificationOptions,
    groupId: string
  ) {
    // Check if muted
    if (options.muteUntil && new Date(options.muteUntil) > new Date()) {
      return;
    }

    // Play sound
    this.playSound(options.sound);

    // Show browser notification if permission granted
    if (!this.isPermissionGranted()) {
      return;
    }

    // Handle bundling
    if (options.bundleMessages) {
      this.bundleNotification(title, body, groupId);
    } else {
      this.showBrowserNotification(
        title,
        options.showPreview ? body : "New message",
        options.isPriority
      );
    }
  }

  private bundleNotification(title: string, body: string, groupId: string) {
    // Add to pending notifications
    this.pendingNotifications.push({
      title,
      body,
      groupId,
      timestamp: Date.now(),
    });

    // Clear existing timeout
    if (this.bundleTimeout) {
      clearTimeout(this.bundleTimeout);
    }

    // Show bundled notification after 2 seconds
    this.bundleTimeout = setTimeout(() => {
      type PendingNotification = typeof this.pendingNotifications[0];
      const groupedByGroupId = this.pendingNotifications.reduce(
        (acc, notif) => {
          if (!acc[notif.groupId]) {
            acc[notif.groupId] = [];
          }
          acc[notif.groupId].push(notif);
          return acc;
        },
        {} as { [groupId: string]: PendingNotification[] }
      );

      Object.entries(groupedByGroupId).forEach(([_, notifications]) => {
        const count = notifications.length;
        const title = notifications[0].title;
        const body =
          count === 1
            ? notifications[0].body
            : `${count} new messages`;

        this.showBrowserNotification(title, body, false);
      });

      this.pendingNotifications = [];
    }, 2000);
  }

  private showBrowserNotification(
    title: string,
    body: string,
    isPriority: boolean
  ) {
    const notification = new Notification(title, {
      body,
      icon: "/icon-192x192.png", // Would need to add app icon
      badge: "/icon-badge.png",
      tag: "whatsapp-clone",
      requireInteraction: isPriority,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 5 seconds if not priority
    if (!isPriority) {
      setTimeout(() => notification.close(), 5000);
    }
  }

  shouldNotify(
    message: {
      senderId: string;
      hasMentions?: boolean;
      mentions?: Array<{ userId: string | null; isAll: boolean }>;
    },
    currentUserId: string,
    options: NotificationOptions
  ): boolean {
    // Don't notify for own messages
    if (message.senderId === currentUserId) {
      return false;
    }

    // Check if muted
    if (options.muteUntil && new Date(options.muteUntil) > new Date()) {
      return false;
    }

    // If only mentions mode is on
    if (options.onlyMentions) {
      if (!message.hasMentions || !message.mentions) {
        return false;
      }

      // Check if current user is mentioned
      return message.mentions.some(
        (m) => m.userId === currentUserId || m.isAll
      );
    }

    return true;
  }
}

export const notificationManager = NotificationManager.getInstance();
