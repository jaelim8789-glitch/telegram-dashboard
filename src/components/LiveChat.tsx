'use client';

import { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, Send, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const LiveChat = () => {
  const [enabled] = useState(() => {
    if (typeof process === 'undefined') return false;
    return process.env.NEXT_PUBLIC_ENABLE_LIVE_CHAT === 'true';
  });
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '?ˆë…•?˜ì„¸?? TeleMon ê³ ê°ì§€??ì±—ë´‡?…ë‹ˆ?? ë¬´ì—‡???„ì??œë¦´ê¹Œìš”?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!enabled) return null;

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // ?¬ìš©??ë©”ì‹œì§€ ì¶”ê?
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // AI ?‘ë‹µ ?œë??ˆì´??(?¤ì œ êµ¬í˜„?ì„œ??API ?¸ì¶œ)
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: 'ê·€?˜ì˜ ì§ˆë¬¸???€???•ì¸ ì¤‘ì…?ˆë‹¤. TeleMon?€ Telegram ?ë™?”ë? ?„í•œ ?Œë«?¼ìœ¼ë¡? ê³„ì • ê´€ë¦? ?ë™ ?‘ë‹µ, ?ˆì•½ ë°œì†¡ ???¤ì–‘??ê¸°ëŠ¥???œê³µ?©ë‹ˆ??',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'ì£„ì†¡?©ë‹ˆ?? ?‘ë‹µ??ì²˜ë¦¬?˜ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* ì±„íŒ… ë²„íŠ¼ */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-yellow-300"
            aria-label="ê³ ê°ì§€??ì±—ë´‡ ?´ê¸°"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ì±„íŒ… ì°?*/}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-80 h-[500px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* ?¤ë” */}
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 text-black flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span className="font-semibold">TeleMon ì±—ë´‡</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-black/20 transition-colors"
                aria-label="ì±„íŒ…ì°??«ê¸°"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ë©”ì‹œì§€ ?ì—­ */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-[80%] ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.sender === 'user' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}
                    >
                      {message.sender === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Bot className="h-4 w-4 text-black" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        message.sender === 'user'
                          ? 'bg-blue-500 text-white rounded-tr-none'
                          : 'bg-gray-700 text-white rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="flex items-start space-x-2 max-w-[80%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-yellow-500">
                      <Bot className="h-4 w-4 text-black" />
                    </div>
                    <div className="bg-gray-700 text-white rounded-2xl rounded-tl-none px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ?…ë ¥ ?ì—­ */}
            <div className="border-t border-gray-700 p-3 bg-gray-850">
              <div className="flex space-x-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="ë©”ì‹œì§€ë¥??…ë ¥?˜ì„¸??.."
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 max-h-24"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className={`p-2 rounded-lg ${
                    inputValue.trim() && !isLoading
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  } transition-colors`}
                  aria-label="ë©”ì‹œì§€ ?„ì†¡"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                TeleMon AI ì±—ë´‡???¤ì‹œê°„ìœ¼ë¡??„ì??œë¦½?ˆë‹¤
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveChat;
