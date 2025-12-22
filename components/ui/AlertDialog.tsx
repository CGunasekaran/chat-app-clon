"use client";

import { useEffect } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: "error" | "success" | "info";
}

export default function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  type = "error",
}: AlertDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeStyles = {
    error: {
      icon: AlertCircle,
      iconColor: "text-red-600",
      bgColor: "bg-red-50",
      buttonColor: "bg-red-600 hover:bg-red-700",
    },
    success: {
      icon: CheckCircle,
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      buttonColor: "bg-green-600 hover:bg-green-700",
    },
    info: {
      icon: AlertCircle,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const style = typeStyles[type];
  const Icon = style.icon;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`${style.bgColor} rounded-full p-3 flex-shrink-0`}>
              <Icon className={`${style.iconColor} w-6 h-6`} />
            </div>
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {title}
                </h3>
              )}
              <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className={`w-full px-4 py-2.5 ${style.buttonColor} text-white rounded-lg transition font-medium`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
