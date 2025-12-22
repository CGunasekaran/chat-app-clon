import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io("http://localhost:3000", {
      transports: ["websocket"],
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to socket server");
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from socket server");
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
