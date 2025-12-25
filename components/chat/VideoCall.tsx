"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  Users,
  Maximize2,
  Minimize2,
  Circle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Socket } from "socket.io-client";

interface VideoCallProps {
  socket: Socket | null;
  groupId: string;
  userId: string;
  userName: string;
  isGroupCall: boolean;
  onClose: () => void;
}

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

interface PeerConnection {
  [userId: string]: RTCPeerConnection;
}

export default function VideoCall({
  socket,
  groupId,
  userId,
  userName,
  isGroupCall,
  onClose,
}: VideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [callQuality, setCallQuality] = useState<
    "excellent" | "good" | "fair" | "poor"
  >("good");
  const [isReconnecting, setIsReconnecting] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const peerConnectionsRef = useRef<PeerConnection>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const configuration: RTCConfiguration = useMemo(
    () => ({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    }),
    []
  );

  // Define helper functions with useCallback
  const updateCallQuality = useCallback((state: RTCIceConnectionState) => {
    switch (state) {
      case "connected":
        setCallQuality("excellent");
        setIsReconnecting(false);
        break;
      case "checking":
        setCallQuality("good");
        break;
      case "disconnected":
        setCallQuality("poor");
        setIsReconnecting(true);
        break;
      case "failed":
        setCallQuality("poor");
        break;
      default:
        setCallQuality("fair");
    }
  }, []);

  const handleReconnection = useCallback((userId: string) => {
    setIsReconnecting(true);
    setTimeout(() => {
      const peerConnection = peerConnectionsRef.current[userId];
      if (
        peerConnection &&
        peerConnection.iceConnectionState === "disconnected"
      ) {
        peerConnection.restartIce();
      }
    }, 2000);
  }, []);

  // Initialize local media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Notify others about joining
        if (socket) {
          console.log("📹 Joining call room:", groupId, "as user:", userId);
          socket.emit("call:join", {
            callId: groupId,
            userId,
            userName,
            isGroupCall,
          });
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        alert("Could not access camera/microphone. Please check permissions.");
      }
    };

    initializeMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebRTC signaling
  useEffect(() => {
    if (!socket) return;

    // Handle new participant joining
    socket.on("call:user-joined", async ({ userId: newUserId, userName }) => {
      console.log("📹 User joined call:", newUserId, userName);

      // Create peer connection for new user
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionsRef.current[newUserId] = peerConnection;

      // Add local stream tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // Handle incoming stream
      peerConnection.ontrack = (event) => {
        console.log(
          "🎥 Received remote track from:",
          newUserId,
          event.streams[0]
        );
        setParticipants((prev) => {
          const existing = prev.find((p) => p.id === newUserId);
          if (existing) {
            console.log("🔄 Updating existing participant:", newUserId);
            return prev.map((p) =>
              p.id === newUserId ? { ...p, stream: event.streams[0] } : p
            );
          }
          console.log("➕ Adding new participant:", newUserId);
          return [
            ...prev,
            {
              id: newUserId,
              name: userName,
              stream: event.streams[0],
              videoEnabled: true,
              audioEnabled: true,
            },
          ];
        });
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", {
            callId: groupId,
            to: newUserId,
            candidate: event.candidate,
            from: userId,
          });
        }
      };

      // Monitor connection quality
      peerConnection.oniceconnectionstatechange = () => {
        updateCallQuality(peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === "disconnected") {
          handleReconnection(newUserId);
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log("📤 Sending offer to:", newUserId);
      socket.emit("call:offer", {
        callId: groupId,
        to: newUserId,
        offer,
        from: userId,
      });
    });

    // Handle receiving offer
    socket.on(
      "call:offer",
      async ({
        from,
        offer,
      }: {
        from: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        console.log("📥 Received offer from:", from);
        const peerConnection = new RTCPeerConnection(configuration);
        peerConnectionsRef.current[from] = peerConnection;

        if (localStream) {
          localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
          });
        }

        peerConnection.ontrack = (event) => {
          console.log("🎥 Received remote track from:", from, event.streams[0]);
          setParticipants((prev) => {
            const existing = prev.find((p) => p.id === from);
            if (existing) {
              console.log("🔄 Updating existing participant:", from);
              return prev.map((p) =>
                p.id === from ? { ...p, stream: event.streams[0] } : p
              );
            }
            console.log("➕ Adding new participant:", from);
            return [
              ...prev,
              {
                id: from,
                name: from ? `User ${from.slice(0, 6)}` : "Participant",
                stream: event.streams[0],
                videoEnabled: true,
                audioEnabled: true,
              },
            ];
          });
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("call:ice-candidate", {
              callId: groupId,
              to: from,
              candidate: event.candidate,
              from: userId,
            });
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          updateCallQuality(peerConnection.iceConnectionState);
        };

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log("📤 Sending answer to:", from);
        socket.emit("call:answer", {
          callId: groupId,
          to: from,
          answer,
          from: userId,
        });
      }
    );

    // Handle receiving answer
    socket.on(
      "call:answer",
      async ({
        from,
        answer,
      }: {
        from: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        console.log("📥 Received answer from:", from);
        const peerConnection = peerConnectionsRef.current[from];
        if (peerConnection) {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          console.log("✅ Set remote description for:", from);
        } else {
          console.error("❌ No peer connection found for:", from);
        }
      }
    );

    // Handle ICE candidates
    socket.on(
      "call:ice-candidate",
      ({
        from,
        candidate,
      }: {
        from: string;
        candidate: RTCIceCandidateInit;
      }) => {
        const peerConnection = peerConnectionsRef.current[from];
        if (peerConnection) {
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    );

    // Handle user leaving
    socket.on("call:user-left", ({ userId: leftUserId }) => {
      const peerConnection = peerConnectionsRef.current[leftUserId];
      if (peerConnection) {
        peerConnection.close();
        delete peerConnectionsRef.current[leftUserId];
      }
      setParticipants((prev) => prev.filter((p) => p.id !== leftUserId));
    });

    // Handle media toggle events
    socket.on("call:toggle-video", ({ userId, enabled }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, videoEnabled: enabled } : p))
      );
    });

    socket.on("call:toggle-audio", ({ userId, enabled }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, audioEnabled: enabled } : p))
      );
    });

    return () => {
      socket.off("call:user-joined");
      socket.off("call:offer");
      socket.off("call:answer");
      socket.off("call:ice-candidate");
      socket.off("call:user-left");
      socket.off("call:toggle-video");
      socket.off("call:toggle-audio");
    };
  }, [
    socket,
    localStream,
    updateCallQuality,
    handleReconnection,
    configuration,
  ]);

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        socket?.emit("call:toggle-video", {
          callId: groupId,
          userId,
          enabled: videoTrack.enabled,
        });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        socket?.emit("call:toggle-audio", {
          callId: groupId,
          userId,
          enabled: audioTrack.enabled,
        });
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      // Replace video track in all peer connections
      const screenTrack = screenStream.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach((peerConnection) => {
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      // Handle screen share stop
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setIsScreenSharing(false);

    // Switch back to camera
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach((peerConnection) => {
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  };

  const togglePictureInPicture = async () => {
    try {
      if (localVideoRef.current) {
        if (!isPictureInPicture) {
          await localVideoRef.current.requestPictureInPicture();
          setIsPictureInPicture(true);
        } else {
          await document.exitPictureInPicture();
          setIsPictureInPicture(false);
        }
      }
    } catch (error) {
      console.error("Error toggling picture-in-picture:", error);
    }
  };

  const startRecording = () => {
    if (!localStream) return;

    try {
      const mediaRecorder = new MediaRecorder(localStream, {
        mimeType: "video/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `call-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Update recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Recording is not supported in this browser");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());

    // Notify others
    socket?.emit("call:leave", { callId: groupId, userId });

    onClose();
  };

  const getQualityColor = () => {
    switch (callQuality) {
      case "excellent":
        return "text-green-500";
      case "good":
        return "text-blue-500";
      case "fair":
        return "text-yellow-500";
      case "poor":
        return "text-red-500";
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold text-lg">
            {isGroupCall ? "Group Call" : "Video Call"}
          </h2>
          {isGroupCall && (
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span className="text-sm">{participants.length + 1}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Call Quality Indicator */}
          <div className="flex items-center gap-2">
            {isReconnecting ? (
              <WifiOff
                className={`w-5 h-5 ${getQualityColor()} animate-pulse`}
              />
            ) : (
              <Wifi className={`w-5 h-5 ${getQualityColor()}`} />
            )}
            <span className={`text-sm ${getQualityColor()}`}>
              {isReconnecting ? "Reconnecting..." : callQuality}
            </span>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 text-red-500">
              <Circle className="w-3 h-3 fill-current animate-pulse" />
              <span className="text-sm font-mono">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-hidden p-4">
        <div
          className={`h-full grid gap-4 ${
            participants.length === 0
              ? "grid-cols-1"
              : participants.length === 1
              ? "grid-cols-2"
              : participants.length <= 4
              ? "grid-cols-2 grid-rows-2"
              : "grid-cols-3 grid-rows-2"
          }`}
        >
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {userName[0]?.toUpperCase()}
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded-full text-white text-sm">
              You {isScreenSharing && "(Screen)"}
            </div>
            {!isAudioEnabled && (
              <div className="absolute top-4 right-4 bg-red-500 p-2 rounded-full">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Participant Videos */}
          {participants
            .filter((participant) => participant.id)
            .map((participant) => (
              <div
                key={participant.id}
                className="relative bg-gray-800 rounded-lg overflow-hidden"
              >
                {participant.stream && participant.videoEnabled ? (
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el) el.srcObject = participant.stream || null;
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-700">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                      {participant.name[0]?.toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded-full text-white text-sm">
                  {participant.name}
                </div>
                {!participant.audioEnabled && (
                  <div className="absolute top-4 right-4 bg-red-500 p-2 rounded-full">
                    <MicOff className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-6">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-4">
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${
              isVideoEnabled
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            } transition-colors`}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${
              isAudioEnabled
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            } transition-colors`}
            title={isAudioEnabled ? "Mute" : "Unmute"}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className={`p-4 rounded-full ${
              isScreenSharing ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
            } transition-colors`}
            title="Share screen"
          >
            <MonitorUp className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-4 rounded-full ${
              isRecording ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
            } transition-colors`}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            <Circle
              className={`w-6 h-6 text-white ${isRecording && "fill-current"}`}
            />
          </button>

          <button
            onClick={togglePictureInPicture}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Picture-in-picture"
          >
            {isPictureInPicture ? (
              <Minimize2 className="w-6 h-6 text-white" />
            ) : (
              <Maximize2 className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
            title="End call"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
