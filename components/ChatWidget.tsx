
import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, X, Minimize2, Maximize2, Trash2, GripVertical, Mic, Phone, PhoneOff, BarChart2 } from 'lucide-react';
import { Chat, GenerateContentResponse, Content } from "@google/genai";
import ChatMessage from './ChatMessage';
import { createConversationSession, saveChatMessage } from '../services/supabaseService';
import { createChatSession, sendMessageStream, LiveClient } from '../services/geminiService';
import { CustomerContext, Product, VendorContext, CartItem, Storefront } from '../types';
import { MOCK_USER_ID } from '../constants';

interface ChatWidgetProps {
  context: CustomerContext;
  vendorContext?: VendorContext | null;
  isConnected: boolean;
  allProducts: Product[]; 
  currentView: 'home' | 'shop' | 'cart' | 'wishlist' | 'vendor_dashboard' | 'store_profile' | 'artisans';
  
  // New props for website awareness
  currentCartItems?: CartItem[];
  currentWishlistIds?: number[];
  currentlyDisplayedProducts?: Product[]; 
  currentSelectedStore?: Storefront | null;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  context, 
  vendorContext, 
  isConnected, 
  allProducts, 
  currentView,
  currentCartItems,
  currentWishlistIds,
  currentlyDisplayedProducts,
  currentSelectedStore
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Initialize messages from Local Storage
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string }[]>(() => {
    try {
      const saved = localStorage.getItem('sneak_peek_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load chat history", e);
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // -- VOICE MODE STATE --
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [audioLevel, setAudioLevel] = useState(0);
  const liveClientRef = useRef<LiveClient | null>(null);
  
  // -- DRAGGABLE LOGIC STATE --
  const widgetRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 }); 
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set initial position on mount
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
  }, [messages, streaming, isOpen, isExpanded, isVoiceMode]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('sneak_peek_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Re-initialize chat when context, products, or financial config changes
  useEffect(() => {
    if (context && allProducts.length > 0) {
      initChat();
    }
  }, [context, vendorContext, allProducts]);

  // Cleanup Voice on unmount or close
  useEffect(() => {
    if (!isOpen && isVoiceMode) {
        endVoiceCall();
    }
  }, [isOpen]);

  // -- DRAG HANDLERS (MOUSE & TOUCH) --

  const handleDragStart = (clientX: number, clientY: number) => {
    if (isExpanded) return;
    
    // Calculate offset: where inside the element did we click?
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragOffset.current = {
        x: clientX - rect.left,
        y: clientY - rect.top
    };

    isDragging.current = true;
    hasMoved.current = false; // Reset move tracker

    // Temporarily remove transition for instant follow
    if (widgetRef.current) {
        widgetRef.current.style.transition = 'none';
    }
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging.current || !widgetRef.current) return;

    const newX = clientX - dragOffset.current.x;
    const newY = clientY - dragOffset.current.y;

    // Check if we've moved enough to consider it a drag (buffer of 5px)
    if (Math.abs(newX - position.x) > 5 || Math.abs(newY - position.y) > 5) {
        hasMoved.current = true;
    }

    // Direct DOM update for performance
    widgetRef.current.style.left = `${newX}px`;
    widgetRef.current.style.top = `${newY}px`;
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Save final position to state
    if (widgetRef.current) {
        const rect = widgetRef.current.getBoundingClientRect();
        
        // Basic boundary check to keep it on screen
        let finalX = rect.left;
        let finalY = rect.top;
        const width = rect.width;
        const height = rect.height;

        if (finalX < 0) finalX = 10;
        if (finalY < 0) finalY = 10;
        if (finalX + width > window.innerWidth) finalX = window.innerWidth - width - 10;
        if (finalY + height > window.innerHeight) finalY = window.innerHeight - height - 10;

        setPosition({ x: finalX, y: finalY });
        
        // Restore transition
        widgetRef.current.style.transition = 'all 0.3s ease-out';
        widgetRef.current.style.left = `${finalX}px`;
        widgetRef.current.style.top = `${finalY}px`;
    }
  };

  // Mouse Event Wrappers
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    e.preventDefault(); // Prevent text selection
    handleDragStart(e.clientX, e.clientY);
    
    const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientX, ev.clientY);
    const onMouseUp = () => {
        handleDragEnd();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Touch Event Wrappers
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging.current) e.preventDefault(); // Prevent scroll while dragging bubble
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  // Click Handler (Only opens if not dragged)
  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!hasMoved.current) {
        setIsOpen(true);
    }
  };

  // -- CHAT LOGIC --

  const initChat = async () => {
    if (!chatSession) setLoading(true);

    const sid = await createConversationSession(MOCK_USER_ID);
    setDbSessionId(sid);

    const history: Content[] = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const chat = createChatSession(context, allProducts, history, vendorContext);
    setChatSession(chat);

    if (messages.length === 0) {
        const greetingName = context.profile?.username || "there";
        let greetingMsg = `Hello ${greetingName}! Welcome to Sneak Peek! I'm Cipher.`;
        
        if (vendorContext) {
            greetingMsg += ` I see you're the owner of ${vendorContext.store.name}. I can help you with product descriptions, pricing strategy, or store ideas!`;
        } else {
            greetingMsg += ` I can help you find products, check stock, or suggest gifts. How can I help you today?`;
        }
        setMessages([{ role: 'model', content: greetingMsg }]);
    }
    
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('sneak_peek_chat_history');
    setChatSession(null);
    setTimeout(() => initChat(), 100);
  };

  const handleSend = async () => {
    if (!input.trim() || !chatSession || streaming) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setStreaming(true);

    if (dbSessionId) {
        saveChatMessage(dbSessionId, MOCK_USER_ID, 'user', userMessage);
    }

    try {
      const messageWithContext = `[Context: User is currently viewing the ${currentView} page] ${userMessage}`;
      const result = await sendMessageStream(chatSession, messageWithContext);
      
      let fullResponse = "";
      setMessages(prev => [...prev, { role: 'model', content: "" }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const text = c.text;
        if (text) {
          fullResponse += text;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullResponse;
            return newMessages;
          });
        }
      }

      if (dbSessionId && fullResponse) {
          saveChatMessage(dbSessionId, MOCK_USER_ID, 'model', fullResponse);
      }

    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = "I apologize, but I'm having trouble connecting right now. Please try again.";
      setMessages(prev => [...prev, { role: 'model', content: errorMsg }]);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // -- VOICE LOGIC --

  const startVoiceCall = async () => {
      setIsVoiceMode(true);
      setVoiceStatus('connecting');
      
      const client = new LiveClient({
          onVolume: (vol) => setAudioLevel(Math.min(1, vol * 5)), // Amplify for visualizer
          onTranscript: (text, isUser) => {
             // Optional: Log transcripts to chat history if desired
          },
          onStatusChange: (status) => {
              if (status === 'connected') setVoiceStatus('connected');
              if (status === 'disconnected') setVoiceStatus('disconnected');
              if (status === 'error') {
                  setVoiceStatus('error');
                  setTimeout(() => endVoiceCall(), 3000);
              }
          }
      });
      
      liveClientRef.current = client;
      await client.start(
        context, 
        allProducts, 
        currentView,
        currentCartItems,
        currentWishlistIds,
        currentlyDisplayedProducts,
        currentSelectedStore
      );
  };

  const endVoiceCall = () => {
      if (liveClientRef.current) {
          liveClientRef.current.disconnect();
          liveClientRef.current = null;
      }
      setIsVoiceMode(false);
      setVoiceStatus('disconnected');
      setAudioLevel(0);
  };

  // --- RENDER ---

  // Render Widget Bubble (Closed)
  if (!isOpen) {
    return (
      <div 
        ref={widgetRef}
        style={{ 
            position: 'fixed', 
            left: position.x, 
            top: position.y,
            touchAction: 'none' // Important for pointer events
        }}
        className="z-50 cursor-grab active:cursor-grabbing group"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
      >
        <div className="relative">
            {/* Pulsing Ring Effect */}
            <div className="absolute inset-0 rounded-full bg-belize-teal/40 blur-md animate-pulse"></div>
            
            {/* Main Orb */}
            <div className="relative w-16 h-16 rounded-full bg-black/80 backdrop-blur-md border border-white/20 shadow-[0_0_20px_rgba(0,127,139,0.3)] flex items-center justify-center overflow-hidden transition-transform transform group-hover:scale-110 group-active:scale-95">
                
                {/* Inner Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-belize-teal/20 to-transparent"></div>
                
                {/* SVG Logo (Abstract Eye) */}
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

                {/* Notification Dot */}
                <div className="absolute top-3 right-3 w-3 h-3 bg-belize-coral rounded-full shadow-[0_0_8px_rgba(255,127,80,0.8)] border border-black/50"></div>
            </div>

            {/* Hover Tooltip (Text Label) */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap">
                <div className="bg-black/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 shadow-xl">
                    Ask Cipher
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Render Chat Window (Open)
  return (
    <div 
        ref={widgetRef}
        style={isExpanded ? {} : { 
            position: 'fixed', 
            left: position.x, 
            top: position.y,
            transition: isDragging.current ? 'none' : 'all 0.3s ease-out'
        }}
        className={`fixed z-50 bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden font-sans
        ${isExpanded 
            ? 'inset-0 md:inset-4 md:rounded-2xl' 
            : 'w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] rounded-3xl'
        }
        `}
    >
      {/* Header - Draggable Area */}
      <div 
        className={`h-16 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between px-4 shrink-0 
            ${!isExpanded ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center gap-3 select-none pointer-events-none">
          {/* Header Logo */}
          <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center border border-white/10">
            <Sparkles size={16} className="text-belize-teal" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2 tracking-wide">
                CIPHER
                {!isExpanded && <GripVertical size={14} className="text-white/30" />}
            </h3>
            <p className="text-[10px] text-belize-coral font-bold tracking-widest uppercase">
                {isVoiceMode ? 'Live Voice' : 'AI Concierge'}
            </p>
          </div>
        </div>
        
        {/* Controls (Not Draggable) */}
        <div 
            className="flex items-center gap-1"
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking buttons
            onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Voice Toggle */}
          {!isVoiceMode && (
              <button 
                onClick={startVoiceCall}
                className="p-2 text-belize-teal bg-white/10 hover:bg-white/20 rounded-full transition-colors mr-1"
                title="Start Voice Call"
              >
                <Phone size={16} fill="currentColor" />
              </button>
          )}

          <button 
            onClick={clearChat}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Clear Chat History"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden md:block"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-white/60 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* CALL UI OVERLAY */}
      {isVoiceMode ? (
          <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden animate-in fade-in zoom-in duration-300">
             {/* Background Pulse */}
             <div 
               className="absolute w-64 h-64 rounded-full bg-belize-teal/20 blur-3xl transition-transform duration-100 ease-out"
               style={{ transform: `scale(${1 + audioLevel})` }}
             ></div>
             <div 
               className="absolute w-48 h-48 rounded-full bg-belize-coral/10 blur-2xl transition-transform duration-100 ease-out delay-75"
               style={{ transform: `scale(${1 + audioLevel * 0.8})` }}
             ></div>

             {/* Avatar */}
             <div className="relative z-10 w-32 h-32 rounded-full border-4 border-white/10 bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                 <div className="absolute inset-0 rounded-full border border-belize-teal/30 animate-ping opacity-20"></div>
                 <Sparkles size={48} className="text-belize-teal" />
             </div>

             {/* Status Text */}
             <div className="relative z-10 mt-8 text-center">
                 <h2 className="text-2xl font-bold text-white mb-2">Cipher</h2>
                 <div className="flex items-center justify-center gap-2">
                     {voiceStatus === 'connecting' ? (
                         <>
                            <Loader2 size={14} className="text-belize-coral animate-spin" />
                            <span className="text-sm text-belize-coral font-medium">Connecting...</span>
                         </>
                     ) : voiceStatus === 'connected' ? (
                         <>
                            <div className="flex items-end gap-1 h-4">
                                <div className="w-1 bg-green-400 rounded-full animate-pulse" style={{ height: `${20 + audioLevel * 80}%` }}></div>
                                <div className="w-1 bg-green-400 rounded-full animate-pulse delay-75" style={{ height: `${30 + audioLevel * 60}%` }}></div>
                                <div className="w-1 bg-green-400 rounded-full animate-pulse delay-150" style={{ height: `${20 + audioLevel * 80}%` }}></div>
                            </div>
                            <span className="text-sm text-green-400 font-medium">Live</span>
                         </>
                     ) : (
                         <span className="text-sm text-red-400 font-medium">Connection Failed</span>
                     )}
                 </div>
             </div>
             
             {/* Visualizer Bar (Fake) */}
             <div className="mt-12 flex items-center gap-1 h-12 opacity-50">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div 
                        key={i} 
                        className="w-1 bg-white rounded-full transition-all duration-75"
                        style={{ 
                            height: voiceStatus === 'connected' ? `${Math.max(10, Math.random() * 100 * audioLevel)}%` : '10%'
                        }}
                    ></div>
                ))}
             </div>

             {/* Controls */}
             <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
                 <button 
                   onClick={endVoiceCall}
                   className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-110"
                 >
                     <PhoneOff size={24} />
                 </button>
             </div>
          </div>
      ) : (
          /* TEXT CHAT UI */
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 scroll-smooth">
                {messages.map((msg, idx) => (
                <ChatMessage key={idx} role={msg.role} content={msg.content} />
                ))}
                
                {streaming && (
                <div className="flex items-center gap-2 text-gray-400 text-sm ml-14 mb-4">
                    <Loader2 size={14} className="animate-spin text-belize-teal" />
                    <span className="text-xs font-medium tracking-wide">Processing...</span>
                </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={vendorContext ? "Ask about pricing, descriptions, or inventory..." : "Ask anything about our products..."}
                    className="w-full pl-5 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-belize-teal/20 focus:border-belize-teal/50 transition-all text-sm shadow-inner"
                    disabled={streaming}
                    autoFocus
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || streaming}
                    className={`absolute right-2 top-2 p-1.5 rounded-full transition-all duration-200 
                    ${!input.trim() || streaming 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'bg-belize-teal text-white hover:bg-belize-jungle shadow-md transform hover:scale-105'
                    }`}
                >
                    {streaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                </button>
                </div>
                <div className="flex justify-center items-center gap-1.5 mt-3 opacity-50">
                <Sparkles size={10} className="text-belize-teal" />
                <p className="text-[10px] text-gray-500 font-medium">
                    Powered by Sneak Peek Intelligence
                </p>
                </div>
            </div>
          </>
      )}
    </div>
  );
};

export default ChatWidget;
