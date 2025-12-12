import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, X, Minimize2, Maximize2, Trash2, GripVertical, Mic, Phone, PhoneOff, BarChart2 } from 'lucide-react';
import ChatMessage from './ChatMessage';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string }[]>([
      { role: 'model', content: 'Hello there! Welcome to Sneak Peek! Database functionality has been removed.' }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const widgetRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 }); 
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setPosition({ 
            x: window.innerWidth - 90, 
            y: window.innerHeight - 100 
        });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isExpanded]);

  const clearChat = () => {
    setMessages([{ role: 'model', content: 'Chat cleared. How can I help you?' }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Simulate a canned response
    setTimeout(() => {
        setLoading(false);
        setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, my connection to the database has been removed. I can't process your request." }]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div 
        ref={widgetRef}
        style={{ 
            position: 'fixed', 
            left: position.x, 
            top: position.y,
            touchAction: 'none'
        }}
        className="z-50 cursor-grab active:cursor-grabbing group"
        onClick={() => setIsOpen(true)}
      >
        <div className="relative">
            <div className="absolute inset-0 rounded-full bg-belize-teal/40 blur-md animate-pulse"></div>
            <div className="relative w-16 h-16 rounded-full bg-black/80 backdrop-blur-md border border-white/20 shadow-[0_0_20px_rgba(0,127,139,0.3)] flex items-center justify-center overflow-hidden transition-transform transform group-hover:scale-110 group-active:scale-95">
                <div className="absolute inset-0 bg-gradient-to-br from-belize-teal/20 to-transparent"></div>
                <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-lg relative z-10" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                    <linearGradient id="bubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#007f8b" />
                        <stop offset="100%" stopColor="#ff7f50" />
                    </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#bubbleGradient)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="20" fill="#fff" />
                </svg>
                <div className="absolute top-3 right-3 w-3 h-3 bg-belize-coral rounded-full shadow-[0_0_8px_rgba(255,127,80,0.8)] border border-black/50"></div>
            </div>
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap">
                <div className="bg-black/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 shadow-xl">
                    Ask Cipher
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div 
        ref={widgetRef}
        style={isExpanded ? {} : { 
            position: 'fixed', 
            left: position.x, 
            top: position.y,
            transition: 'all 0.3s ease-out'
        }}
        className={`fixed z-50 bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden font-sans
        ${isExpanded 
            ? 'inset-0 md:inset-4 md:rounded-2xl' 
            : 'w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] rounded-3xl'
        }
        `}
    >
      <div className="h-16 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3 select-none pointer-events-none">
          <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center border border-white/10">
            <Sparkles size={16} className="text-belize-teal" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2 tracking-wide">
                CIPHER
            </h3>
            <p className="text-[10px] text-belize-coral font-bold tracking-widest uppercase">
                AI Concierge
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Clear Chat History">
            <Trash2 size={16} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden md:block">
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 text-white/60 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 scroll-smooth">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm ml-14 mb-4">
                <Loader2 size={14} className="animate-spin text-belize-teal" />
                <span className="text-xs font-medium tracking-wide">Processing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <div className="relative">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="w-full pl-5 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-belize-teal/20 focus:border-belize-teal/50 transition-all text-sm shadow-inner"
                disabled={loading}
                autoFocus
            />
            <button onClick={handleSend} disabled={!input.trim() || loading} className={`absolute right-2 top-2 p-1.5 rounded-full transition-all duration-200 ${!input.trim() || loading ? 'text-gray-300 cursor-not-allowed' : 'bg-belize-teal text-white hover:bg-belize-jungle shadow-md transform hover:scale-105'}`}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
            </button>
          </div>
          <div className="flex justify-center items-center gap-1.5 mt-3 opacity-50">
            <Sparkles size={10} className="text-belize-teal" />
            <p className="text-[10px] text-gray-500 font-medium">
                Powered by Sneak Peek Intelligence
            </p>
          </div>
      </div>
    </div>
  );
};

export default ChatWidget;