import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Use current origin for Socket.IO connection
    // In production, this will be the deployed URL
    // In development, it will be localhost:3000
    const socketUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";

    const socketInstance = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000,
    });

    socketInstance.on("connect", () => {
      console.log("✅ Socket connected:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    // Set socket after event listeners are registered
    Promise.resolve().then(() => {
      setSocket(socketInstance);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
};
