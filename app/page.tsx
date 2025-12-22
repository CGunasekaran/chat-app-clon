"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Users, Phone, Shield } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          // Redirect to chat if authenticated
          router.push("/chat");
        }
      })
      .catch(() => {
        // Stay on landing page if not authenticated
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Chat App</h1>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-green-600 hover:text-green-700 font-medium transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition font-medium"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Simple. Secure. Reliable messaging.
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with friends and family through group chats and voice calls.
            All your conversations in one place.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-green-600 text-white text-lg rounded-full hover:bg-green-700 transition font-semibold shadow-lg"
          >
            Get Started
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-2xl shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              Group Chats
            </h3>
            <p className="text-gray-600">
              Create groups and stay connected with multiple people at once.
              Share messages instantly.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Phone className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              Voice Calls
            </h3>
            <p className="text-gray-600">
              Make crystal clear voice calls with friends and family in your
              groups.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              Secure & Private
            </h3>
            <p className="text-gray-600">
              Your messages are secure. Connect with confidence knowing your
              privacy is protected.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-green-600 rounded-3xl p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to start chatting?</h3>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of users already using Chat App for their daily
            conversations.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-white text-green-600 text-lg rounded-full hover:bg-gray-100 transition font-semibold"
          >
            Create Your Account
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
          <p>&copy; 2025 Chat App. Built with Next.js and Socket.io</p>
        </div>
      </footer>
    </div>
  );
}
