import webpush from "web-push";

// Generate VAPID keys once and store them as environment variables
// Run: npx web-push generate-vapid-keys
// Or use these for development (change in production!)

const vapidKeys = {
  publicKey:
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    "BEL5nJp5K8xH0QZQGYqVMqJ5KzLQ5XYwXZ7C8qLvZ5pQ0QYZ5KzLQ5XYwXZ7C8qLvZ5pQ0QYZ5KzLQ5XYwXZ7C8",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
};

// Initialize VAPID details lazily at runtime
let vapidInitialized = false;

function ensureVapidInitialized() {
  if (!vapidInitialized && vapidKeys.publicKey && vapidKeys.privateKey) {
    webpush.setVapidDetails(
      "mailto:gunasekaran.bsc.cs@gmail.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    vapidInitialized = true;
  }
}

export { webpush, vapidKeys };

export async function sendPushNotification(
  subscription: any,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
  }
) {
  try {
    ensureVapidInitialized(); // Initialize VAPID before sending
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return { success: false, error: error.message };
  }
}
