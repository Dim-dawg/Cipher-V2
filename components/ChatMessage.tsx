import React, { useState, useEffect } from 'react';
import { User, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { generateProductImage } from '../services/geminiService';

interface ChatMessageProps {
  role: 'user' | 'model';
  content: string;
}

// Sub-component to handle image loading and generation
const GenerativeProductImage: React.FC<{ src: string, alt: string }> = ({ src, alt }) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'generating' | 'error'>('loading');

  useEffect(() => {
    // If src is empty initially, start generation immediately
    if (!src) {
        handleGeneration();
    }
  }, [src]);

  const handleLoad = () => {
    // Only mark as loaded if we aren't already generating a replacement
    if (status !== 'generating') {
        setStatus('loaded');
    }
  };

  const handleGeneration = async () => {
    if (status === 'generating') return;
    
    setStatus('generating');
    try {
      const generatedBase64 = await generateProductImage(alt);
      if (generatedBase64) {
        setImgSrc(generatedBase64);
        setStatus('loaded'); // Generated image loaded successfully
      } else {
        // Generation failed, fallback
        setImgSrc(`https://placehold.co/600x400/007f8b/ffffff?text=${encodeURIComponent(alt)}`);
        setStatus('error');
      }
    } catch (e) {
      console.error("Image generation failed", e);
      setImgSrc(`https://placehold.co/600x400/007f8b/ffffff?text=${encodeURIComponent(alt)}`);
      setStatus('error');
    }
  };

  return (
    <div className="relative h-48 w-full bg-gray-100 overflow-hidden flex items-center justify-center group/img">
      {/* Loading/Generating Overlay */}
      {status === 'generating' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm">
           <Sparkles className="w-8 h-8 text-belize-coral animate-pulse mb-2" />
           <span className="text-xs text-gray-500 font-medium animate-pulse">Designing image...</span>
        </div>
      )}

      {/* Actual Image */}
      <img 
        src={imgSrc} 
        alt={alt} 
        className={`w-full h-full object-cover transition-all duration-500 ${
            status === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        } ${status === 'generating' ? 'blur-sm' : ''} group-hover/img:scale-105`}
        onLoad={handleLoad}
        onError={handleGeneration} // Trigger generation on load error
      />
      
      {/* Badge */}
      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm z-20 backdrop-blur-md transition-opacity duration-300
        ${status === 'loading' || status === 'generating' ? 'opacity-0' : 'opacity-100'}
        ${imgSrc.startsWith('data:') ? 'bg-belize-coral/90 text-white' : 'bg-white/90 text-belize-teal'}
      `}>
        {imgSrc.startsWith('data:') ? (
            <span className="flex items-center gap-1"><Sparkles size={10} /> AI GENERATED</span>
        ) : 'AUTHENTIC'}
      </div>
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  const isUser = role === 'user';

  // Function to render content with markdown-style images
  const renderContent = (text: string) => {
    // Regex to find markdown images: ![alt](url)
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = imageRegex.exec(text)) !== null) {
      // 1. Push text preceding the image
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
      }

      // 2. Extract image details
      const alt = match[1] || "Product Image";
      const src = match[2];
      
      // 3. Render the Product Card with Generative Image
      parts.push(
        <div key={`img-${match.index}`} className="my-3 block w-full max-w-sm mx-auto md:mx-0">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group">
            
            {/* Replaced standard img with Generative Component */}
            <GenerativeProductImage src={src} alt={alt} />
            
            <div className="p-3">
              <h4 className="font-bold text-gray-800 text-sm line-clamp-1" title={alt}>{alt}</h4>
              <div className="flex justify-between items-center mt-2">
                 <span className="text-xs text-gray-500">Belize Treasures</span>
                 <button className="text-xs text-white bg-belize-teal hover:bg-belize-jungle px-3 py-1.5 rounded-md transition-colors font-medium">
                   View Details
                 </button>
              </div>
            </div>
          </div>
        </div>
      );

      lastIndex = imageRegex.lastIndex;
    }

    // 4. Push remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md
          ${isUser ? 'bg-belize-blue text-white' : 'bg-gradient-to-br from-belize-teal to-belize-jungle text-white'}
        `}>
          {isUser ? <User size={20} /> : <Bot size={20} />}
        </div>

        {/* Message Bubble */}
        <div className={`
          p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap
          ${isUser 
            ? 'bg-belize-blue/10 text-gray-800 rounded-tr-none border border-belize-blue/20' 
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'}
        `}>
          {renderContent(content)}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;