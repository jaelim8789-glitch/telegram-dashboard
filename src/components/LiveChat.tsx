'use client';

import { useState } from 'react';
import { X, MessageCircle, Bot } from 'lucide-react';

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-96 bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <span className="font-semibold">TeleMon Support</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">How can I help you?</p>
      </div>
    </div>
  );
}
