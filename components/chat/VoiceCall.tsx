"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import Peer from "simple-peer";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";

interface VoiceCallProps {
  socket: Socket | null;
  onClose: () => void;
  groupId?: string;
  userId?: string;
  otherUserId?: string;
  isInitiator?: boolean;
}

export default function VoiceCall({
  socket,
  onClose,
  groupId,
  userId,
  otherUserId,
  isInitiator = false,
}: VoiceCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<string>(
    isInitiator ? "Calling..." : "Connecting..."
  );
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const peerRef = useRef<Peer.Instance | null>(null);

  useEffect(() => {
    if (!socket) return;

    let mounted = true;

    // Get user's audio stream
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setCallStatus("Ready");

        // Create peer connection
        const peer = new Peer({
          initiator: isInitiator,
          trickle: false,
          stream,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
            ],
          },
        });

        peerRef.current = peer;

        peer.on("signal", (signal: Peer.SignalData) => {
          console.log("Sending signal:", signal.type, "to:", otherUserId);
          socket.emit("voice-signal", {
            signal,
            to: `user-${otherUserId}`,
          });
        });

        peer.on("stream", (remoteStream: MediaStream) => {
          console.log("Received remote stream");
          const audio = new Audio();
          audio.srcObject = remoteStream;
          audio.autoplay = true;
          audio.play().catch(console.error);

          remoteAudiosRef.current.set(groupId || "remote", audio);
          setCallStatus("Call in progress");
        });

        peer.on("connect", () => {
          console.log("Peer connected");
          // Don't override "Call in progress" status
        });

        peer.on("error", (err) => {
          console.error("Peer error:", err);
          setCallStatus("Connection error");
        });

        peer.on("close", () => {
          console.log("Peer closed");
          remoteAudiosRef.current.forEach((audio) => {
            audio.pause();
            audio.srcObject = null;
          });
          remoteAudiosRef.current.clear();
        });

        // Listen for incoming signals
        const handleSignal = ({
          signal,
          from,
        }: {
          signal: Peer.SignalData;
          from: string;
        }) => {
          console.log("Received signal:", signal.type, "from:", from);

          if (peerRef.current && !peerRef.current.destroyed) {
            try {
              peerRef.current.signal(signal);
            } catch (err) {
              console.error("Error signaling peer:", err);
            }
          }
        };

        socket.on("voice-signal", handleSignal);

        // Listen for call ended by other party
        const handleCallEnded = () => {
          console.log("Call ended by other party");
          // Clean up and close
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
          }
          if (peerRef.current) {
            peerRef.current.destroy();
          }
          remoteAudiosRef.current.forEach((audio) => {
            audio.pause();
            audio.srcObject = null;
          });
          remoteAudiosRef.current.clear();
          onClose();
        };

        socket.on("voice-call-ended", handleCallEnded);

        // Clean up function for this effect
        return () => {
          socket.off("voice-signal", handleSignal);
          socket.off("voice-call-ended", handleCallEnded);
        };
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
        setCallStatus("Microphone access denied");
      });

    return () => {
      mounted = false;

      // Clean up
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (peerRef.current) {
        peerRef.current.destroy();
      }

      remoteAudiosRef.current.forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
      });
      remoteAudiosRef.current.clear();

      socket.off("voice-signal");
    };
  }, [socket, groupId, isInitiator]);

  const handleEndCall = () => {
    // Notify the other party that call is ending or cancelled
    if (socket && otherUserId) {
      socket.emit("end-voice-call", {
        to: `user-${otherUserId}`,
      });
      // Also emit cancel in case the call wasn't established yet
      socket.emit("cancel-call", {
        to: `user-${otherUserId}`,
      });
    }

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Destroy peer connection
    if (peerRef.current) {
      peerRef.current.destroy();
    }

    // Stop all remote audio
    remoteAudiosRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudiosRef.current.clear();

    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-96 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Phone className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Voice Call</h2>
          <p className="text-gray-600">{callStatus}</p>
        </div>

        <div className="flex justify-center gap-6">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-gray-700" />
            )}
          </button>

          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all"
            title="End call"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
