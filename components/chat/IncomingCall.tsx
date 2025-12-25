"use client";

import { useEffect, useRef } from "react";
import { Phone, Video, PhoneOff } from "lucide-react";

interface IncomingCallProps {
  callerName: string;
  callType: "video" | "audio";
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCall({
  callerName,
  callType,
  onAccept,
  onReject,
}: IncomingCallProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function to stop all audio
  const stopAllAudio = () => {
    // Stop pulse interval FIRST
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }

    // Stop oscillator immediately
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (err) {
        // Already stopped
      }
      oscillatorRef.current = null;
    }

    // Disconnect gain node immediately
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch (err) {
        // Already disconnected
      }
      gainNodeRef.current = null;
    }

    // Stop HTML Audio element immediately
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = "";
        audioRef.current.load();
      } catch (err) {
        // Ignore errors
      }
      audioRef.current = null;
    }

    // Close audio context (async but non-blocking)
    if (audioContextRef.current) {
      const context = audioContextRef.current;
      audioContextRef.current = null; // Clear reference immediately

      try {
        if (context.state !== "closed") {
          // Close immediately without waiting
          context.close().catch(() => {});
        }
      } catch (err) {
        // Ignore all errors
      }
    }
  };

  useEffect(() => {
    // Try to play notification sound file first
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log(
          "Notification.mp3 not found, using generated ringtone:",
          error
        );

        // Fallback to Web Audio API generated ringtone
        try {
          const AudioContext =
            window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext();
          const context = audioContextRef.current;

          // Create oscillator for ringtone
          oscillatorRef.current = context.createOscillator();
          gainNodeRef.current = context.createGain();

          oscillatorRef.current.connect(gainNodeRef.current);
          gainNodeRef.current.connect(context.destination);

          // Set ringtone frequency (pleasant tone)
          oscillatorRef.current.frequency.value = 800;
          oscillatorRef.current.type = "sine";
          gainNodeRef.current.gain.value = 0.3;

          // Create pulsing effect
          pulseIntervalRef.current = setInterval(() => {
            if (gainNodeRef.current && audioContextRef.current) {
              const context = audioContextRef.current;
              gainNodeRef.current.gain.setValueAtTime(0.3, context.currentTime);
              gainNodeRef.current.gain.exponentialRampToValueAtTime(
                0.01,
                context.currentTime + 0.3
              );
            }
          }, 1000);

          oscillatorRef.current.start();
        } catch (err) {
          console.error("Failed to create audio context:", err);
        }
      });
    }

    // Stop ringtone on unmount
    return () => {
      stopAllAudio();
    };
  }, []);

  const handleAccept = () => {
    stopAllAudio();
    onAccept();
  };

  const handleReject = () => {
    stopAllAudio();
    onReject();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm mx-4 text-center animate-bounce-slow">
        {/* Caller Avatar */}
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <span className="text-white font-bold text-3xl">
            {callerName.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Caller Name */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{callerName}</h2>

        {/* Call Type */}
        <p className="text-gray-600 mb-8 flex items-center justify-center gap-2">
          {callType === "video" ? (
            <>
              <Video className="w-5 h-5" />
              Incoming Video Call
            </>
          ) : (
            <>
              <Phone className="w-5 h-5" />
              Incoming Voice Call
            </>
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {/* Reject Button */}
          <button
            onClick={handleReject}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 shadow-lg"
            title="Decline"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 shadow-lg animate-pulse"
            title="Accept"
          >
            {callType === "video" ? (
              <Video className="w-7 h-7 text-white" />
            ) : (
              <Phone className="w-7 h-7 text-white" />
            )}
          </button>
        </div>

        {/* Ringing Animation */}
        <div className="mt-6 flex justify-center gap-1">
          <div
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
