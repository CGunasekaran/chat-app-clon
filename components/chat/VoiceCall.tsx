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
  const [otherUserReady, setOtherUserReady] = useState(false);
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

        console.log("🎤 Got local audio stream:", stream);
        console.log("🎤 Local audio tracks:", stream.getAudioTracks());
        console.log("🆔 My userId:", userId, "Other userId:", otherUserId);
        console.log(
          "🎯 Will emit voice-call-ready to room:",
          `user-${otherUserId}`
        );

        localStreamRef.current = stream;
        setCallStatus("Ready");

        // Notify the other user that we're ready for the call
        console.log("📢 Notifying other user we're ready");
        socket.emit("voice-call-ready", {
          to: `user-${otherUserId}`,
          from: userId,
        });

        // Create peer connection but don't start negotiation yet for initiator
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

        console.log("📞 Peer created, initiator:", isInitiator);
        peerRef.current = peer;

        // Buffer signals if we're the initiator and other user isn't ready yet
        const signalBuffer: Peer.SignalData[] = [];
        let canSendSignals = !isInitiator; // Receiver can send immediately

        peer.on("signal", (signal: Peer.SignalData) => {
          console.log("📤 Generated signal:", signal.type);

          if (canSendSignals || !isInitiator) {
            console.log("📤 Sending signal:", signal.type, "to:", otherUserId);
            socket.emit("voice-signal", {
              signal,
              to: `user-${otherUserId}`,
            });
            console.log("📤 Signal emitted to room: user-" + otherUserId);
          } else {
            console.log(
              "⏸️ Buffering signal until other user is ready:",
              signal.type
            );
            signalBuffer.push(signal);
          }
        });

        // Listen for when other user is ready
        const handleOtherUserReady = () => {
          console.log("✅ Other user is ready! Can now send signals.");
          setOtherUserReady(true);
          canSendSignals = true;

          // Send any buffered signals
          if (signalBuffer.length > 0) {
            console.log("📤 Sending buffered signals:", signalBuffer.length);
            signalBuffer.forEach((signal) => {
              socket.emit("voice-signal", {
                signal,
                to: `user-${otherUserId}`,
              });
            });
            signalBuffer.length = 0;
          }
        };

        console.log(
          "👂 Registering voice-call-ready listener for userId:",
          userId
        );
        socket.on("voice-call-ready", handleOtherUserReady);

        peer.on("stream", (remoteStream: MediaStream) => {
          console.log("🎵 Received remote stream", remoteStream);
          console.log("🎵 Remote stream tracks:", remoteStream.getTracks());
          console.log("🎵 Audio tracks:", remoteStream.getAudioTracks());

          // Create audio element
          const audio = document.createElement("audio");
          audio.srcObject = remoteStream;
          audio.autoplay = true;
          audio.volume = 1.0;
          audio.controls = false;
          audio.playsInline = true;

          // Attach to DOM for browser compatibility
          audio.style.display = "none";
          document.body.appendChild(audio);

          // Log stream info
          console.log("🎵 Audio element created and attached to DOM");
          console.log("🎵 srcObject set:", audio.srcObject !== null);

          // Try to play immediately
          const playPromise = audio.play();

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("✅ Remote audio playing successfully");
                console.log("✅ Audio paused:", audio.paused);
                console.log("✅ Audio volume:", audio.volume);
                setCallStatus("Call in progress");
              })
              .catch((err) => {
                console.error("❌ Error playing remote audio:", err);
                console.error("❌ Error name:", err.name);
                console.error("❌ Error message:", err.message);

                // Try again with user interaction
                setCallStatus("Tap to enable audio");

                // Add click listener to retry playback
                const retryPlay = () => {
                  console.log("🔄 Retrying audio playback...");
                  audio
                    .play()
                    .then(() => {
                      console.log(
                        "✅ Audio playback enabled after user interaction"
                      );
                      setCallStatus("Call in progress");
                      document.removeEventListener("click", retryPlay);
                    })
                    .catch((retryErr) => {
                      console.error("❌ Retry failed:", retryErr);
                    });
                };
                document.addEventListener("click", retryPlay, { once: true });
              });
          }

          remoteAudiosRef.current.set(groupId || "remote", audio);
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
            // Remove from DOM
            if (audio.parentNode) {
              audio.parentNode.removeChild(audio);
            }
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
          console.log("📥 Received signal:", signal.type, "from:", from);
          console.log("📥 Peer exists:", !!peerRef.current);
          console.log("📥 Peer destroyed:", peerRef.current?.destroyed);

          if (peerRef.current && !peerRef.current.destroyed) {
            try {
              console.log("📥 Signaling peer with:", signal.type);
              peerRef.current.signal(signal);
              console.log("✅ Signal processed successfully");
            } catch (err) {
              console.error("❌ Error signaling peer:", err);
            }
          } else {
            console.error("❌ Cannot signal: peer is null or destroyed");
          }
        };

        console.log("👂 Registering voice-signal listener");
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
            // Remove from DOM
            if (audio.parentNode) {
              audio.parentNode.removeChild(audio);
            }
          });
          remoteAudiosRef.current.clear();
          onClose();
        };

        socket.on("voice-call-ended", handleCallEnded);

        // Clean up function for this effect
        return () => {
          socket.off("voice-signal", handleSignal);
          socket.off("voice-call-ended", handleCallEnded);
          socket.off("voice-call-ready", handleOtherUserReady);
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
        // Remove from DOM
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
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

  const handleEnableAudio = () => {
    // Force play all remote audio streams
    remoteAudiosRef.current.forEach((audio) => {
      audio
        .play()
        .then(() => {
          console.log("✅ Audio enabled successfully");
          setCallStatus("Call in progress");
        })
        .catch((err) => {
          console.error("Failed to enable audio:", err);
        });
    });
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

          {callStatus === "Tap to enable audio" && (
            <button
              onClick={handleEnableAudio}
              className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all"
            >
              Enable Audio
            </button>
          )}
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
