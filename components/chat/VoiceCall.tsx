"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import Peer from "simple-peer";
import { Phone, PhoneOff } from "lucide-react";

interface VoiceCallProps {
  socket: Socket | null;
  onClose: () => void;
}

export default function VoiceCall({ socket, onClose }: VoiceCallProps) {
  const [peers, setPeers] = useState<Map<string, Peer.Instance>>(new Map());
  const userAudio = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!socket) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        if (userAudio.current) {
          userAudio.current.srcObject = stream;
        }

        socket.on("voice-signal", ({ signal, from }) => {
          const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
          });

          peer.on("signal", (data: Peer.SignalData) => {
            socket.emit("voice-signal", {
              signal: data,
              to: from,
            });
          });

          peer.signal(signal);

          setPeers((prev) => new Map(prev).set(from, peer));
        });
      });

    return () => {
      peers.forEach((peer) => peer.destroy());
      socket.off("voice-signal");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const handleEndCall = () => {
    peers.forEach((peer) => peer.destroy());
    onClose();
  };

  const toggleMute = () => {
    if (userAudio.current?.srcObject) {
      const stream = userAudio.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Voice Call</h2>

        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full ${
              isMuted ? "bg-red-500" : "bg-gray-300"
            }`}
          >
            <Phone className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>

        <audio ref={userAudio} autoPlay muted />
      </div>
    </div>
  );
}
