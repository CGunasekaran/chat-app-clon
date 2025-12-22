'use client'

import { useState } from 'react'
import { Send, Mic } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (content: string) => void
  onStartVoiceCall: () => void
}

export default function MessageInput({ onSendMessage, onStartVoiceCall }: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message)
      setMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t bg-white p-4">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:border-green-500"
        />
        
        <button
          onClick={onStartVoiceCall}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          title="Start voice call"
        >
          <Mic className="w-5 h-5 text-gray-600" />
        </button>
        
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="p-2 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 transition"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  )
}
