"use client";

import { Bell, BellOff } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useState } from "react";

export default function NotificationSettings() {
  const {
    permission,
    requestPermission,
    isPushEnabled,
    subscribeToPush,
    unsubscribeFromPush,
  } = useNotifications();

  const [loading, setLoading] = useState(false);

  const handleTogglePush = async () => {
    setLoading(true);
    try {
      if (isPushEnabled) {
        await unsubscribeFromPush();
      } else {
        await subscribeToPush();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      await requestPermission();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Notification Settings
        </h3>
        
        {/* Browser Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">
                  Browser Notifications
                </p>
                <p className="text-sm text-gray-500">
                  Get notified when the app is in the background
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {permission === "default" && (
                <button
                  onClick={handleRequestPermission}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Enable"}
                </button>
              )}
              
              {permission === "granted" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <Bell className="w-4 h-4" />
                  Enabled
                </span>
              )}
              
              {permission === "denied" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <BellOff className="w-4 h-4" />
                  Blocked
                </span>
              )}
            </div>
          </div>

          {/* Push Notifications */}
          {permission === "granted" && (
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    Push Notifications
                  </p>
                  <p className="text-sm text-gray-500">
                    Receive notifications even when browser is closed
                  </p>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPushEnabled}
                  onChange={handleTogglePush}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          )}

          {permission === "denied" && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Notifications are blocked.</strong> To enable them,
                click the lock icon in your browser's address bar and allow
                notifications for this site.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sound Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Sound Preferences
        </h4>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="sound"
              value="default"
              defaultChecked
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">Default Sound</span>
          </label>
          
          <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="sound"
              value="none"
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">Silent</span>
          </label>
        </div>
      </div>
    </div>
  );
}
