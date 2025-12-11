
import { GoogleGenAI, Chat, GenerateContentResponse, FunctionDeclaration, Type, Content, LiveServerMessage, Modality, Blob } from "@google/genai";
import { CIPHER_SYSTEM_PROMPT } from "../constants";
import { CustomerContext, Product, VendorContext } from "../types";
import { searchProducts } from "./supabaseService";
import { checkAffordability } from "./internalFinancialService";

let aiClient: GoogleGenAI | null = null;




// Tool Definitions
const searchProductsTool: FunctionDeclaration = {
  name: 'searchProducts',
  description: 'Search for authentic Belizean products in the store catalog. Returns product details including images, prices, and descriptions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Key terms to search for (e.g., "hot sauce", "mahogany", "basket").',
      },
      category: {
        type: Type.STRING,
        description: 'Optional category filter (e.g., "Food", "Home", "Apparel").',
      }
    },
    required: ['query'],
  },
};

const checkAffordabilityTool: FunctionDeclaration = {
  name: 'checkAffordability',
  description: 'Perform a "Financial Vibe Check" to see if the user can afford a product based on their financial forecast.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      price: {
        type: Type.NUMBER,
        description: 'The price of the item to check affordability for.',
      }
    },
    required: ['price'],
  },
};

export const initializeGemini = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Using the injected environment variable
  if (apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
  }
};

// --- SHARED TOOL EXECUTION LOGIC ---
const executeTool = async (name: string, args: any): Promise<any> => {
  if (name === 'searchProducts') {
    console.log(`[Cipher] Searching products: ${JSON.stringify(args)}`);
    const { query, category } = args;
    const products = await searchProducts(query, category);
    return { products: products };
  } 
  else if (name === 'checkAffordability') {
     console.log(`[Cipher] Checking financial health...`);
     const { price } = args;
     const analysis = await checkAffordability(price);
     return { canAfford: analysis };
  }
  return { error: "Unknown tool" };
};

// --- TEXT CHAT HELPERS ---

export const createChatSession = (
  context: CustomerContext, 
  products: Product[],
  history?: Content[],
  vendorContext?: VendorContext | null
): Chat | null => {
  if (!aiClient) return null;

  // Enhance system prompt with dynamic customer data
  let personalizedPrompt = CIPHER_SYSTEM_PROMPT;

  // 1. INJECT PRODUCT CATALOG SUMMARY
  if (products && products.length > 0) {
    const catalogSummary = products.map(p => `- ${p.name} ($${p.price.toFixed(2)}) [${p.category}]`).join('\n');
    personalizedPrompt += `\n\n## STORE CATALOG SUMMARY (Known Inventory)\n${catalogSummary}\n\nUse the list above to be "aware" of what we sell.`;
  }

  // 2. INJECT VENDOR CONTEXT (IF OWNER)
  if (vendorContext) {
    personalizedPrompt += `\n\n## 👑 VENDOR MODE ACTIVATED 👑\n`;
    personalizedPrompt += `You are talking to the **Owner** of the store: "${vendorContext.store.name}".\n`;
    personalizedPrompt += `Their Store Description: "${vendorContext.store.description}"\n`;
    personalizedPrompt += `**Your Role for this User:** Act as a Business Assistant. Help them write product descriptions, suggest new item ideas, or analyze their inventory.\n`;
    personalizedPrompt += `**Current Inventory:** They have ${vendorContext.products.length} products listed.\n`;
  }

  // 3. INJECT CUSTOMER CONTEXT
  if (context.profile) {
    personalizedPrompt += `\n\n## CURRENT USER CONTEXT\n`;
    personalizedPrompt += `**Name:** ${context.profile.username}\n`;
    personalizedPrompt += `**Email:** ${context.profile.email}\n`;
    personalizedPrompt += `**Role:** ${context.profile.role.toUpperCase()}\n`;
    
    if (context.addresses.length > 0) {
      const mainAddr = context.addresses[0];
      personalizedPrompt += `**Location:** ${mainAddr.city}, ${mainAddr.region}, ${mainAddr.country}\n`;
    }
  } else {
    personalizedPrompt += `\n\n## CURRENT USER CONTEXT\nGuest User (Not logged in)`;
  }



  try {
    return aiClient.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: personalizedPrompt,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      },
      history: history || []
    });
  } catch (error) {
    console.error("Failed to create chat session", error);
    return null;
  }
};

export const generateProductImage = async (prompt: string): Promise<string | null> => {
  if (!aiClient) {
    console.warn("AI Client not initialized");
    return null;
  }
  
  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional commercial product photography shot of ${prompt}. Clean white studio background, high resolution, photorealistic, cinematic lighting.` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
         return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating product image:", error);
    return null;
  }
};

export async function* sendMessageStream(chat: Chat, message: string) {
  try {
    let resultStream = await chat.sendMessageStream({ message });
    let functionCalls: any[] = [];
    
    for await (const chunk of resultStream) {
      if (chunk.text) {
        yield chunk;
      }
      if (chunk.functionCalls) {
        functionCalls = functionCalls.concat(chunk.functionCalls);
      }
    }

    if (functionCalls.length > 0) {
      const functionResponses = [];
      
      for (const call of functionCalls) {
        const result = await executeTool(call.name, call.args);
        functionResponses.push({
          id: call.id,
          name: call.name,
          response: result
        });
      }

      if (functionResponses.length > 0) {
        const parts = functionResponses.map(resp => ({
          functionResponse: {
            name: resp.name,
            response: resp.response,
            id: resp.id
          }
        }));

        const nextStream = await chat.sendMessageStream({ message: parts });
        for await (const chunk of nextStream) {
          if (chunk.text) {
            yield chunk;
          }
        }
      }
    }

  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

// --- LIVE API (AUDIO) IMPLEMENTATION ---

// Audio Encoding Helpers
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Create PCM Blob from Float32 (Microphone Input)
function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
  }
  return {
    data: uint8ArrayToBase64(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class LiveClient {
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private sessionPromise: Promise<any> | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  
  constructor(
    private callbacks: {
      onVolume: (vol: number) => void;
      onTranscript: (text: string, isUser: boolean) => void;
      onStatusChange: (status: 'connected' | 'disconnected' | 'error') => void;
    }
  ) {}

  public async start(context: CustomerContext, products: Product[]) {
    if (!aiClient) return;

    try {
      this.callbacks.onStatusChange('connected');
      
      // 1. Setup Audio Contexts
      this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputContext.createGain();
      this.outputNode.connect(this.outputContext.destination);

      // 2. Setup Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.inputSource = this.inputContext.createMediaStreamSource(stream);
      this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);

      // 3. Connect to Gemini Live
      // Construct System Prompt (Simplified for Audio)
      let systemInstruction = CIPHER_SYSTEM_PROMPT;
      // Inject simplified context
      if (context.profile) {
        systemInstruction += `\nUser: ${context.profile.username}. Location: ${context.addresses[0]?.city || 'Belize'}.`;
      }
      if (products.length > 0) {
        systemInstruction += `\nCatalog Summary: ${products.slice(0, 50).map(p => p.name).join(', ')}... (and more).`;
      }

      this.sessionPromise = aiClient.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {}, // Corrected: Removed invalid 'model' property
        },
        callbacks: {
          onopen: () => {
             console.log("[Live] Session Opened");
             this.startAudioProcessing();
          },
          onmessage: async (msg: LiveServerMessage) => {
             this.handleServerMessage(msg);
          },
          onclose: () => {
             console.log("[Live] Session Closed");
             this.callbacks.onStatusChange('disconnected');
          },
          onerror: (err) => {
             console.error("[Live] Error", err);
             this.callbacks.onStatusChange('error');
          }
        }
      });

    } catch (e) {
      console.error("Failed to start Live Client", e);
      this.callbacks.onStatusChange('error');
    }
  }

  private startAudioProcessing() {
    if (!this.processor || !this.inputSource || !this.inputContext) return;

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate Volume for Visualizer
      let sum = 0;
      for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      this.callbacks.onVolume(rms);

      // Create Blob and Send
      const pcmBlob = createPcmBlob(inputData);
      
      if (this.sessionPromise) {
        this.sessionPromise.then(session => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      }
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputContext.destination);
  }

  private async handleServerMessage(message: LiveServerMessage) {
    const { serverContent, toolCall } = message;

    // 1. Handle Audio Output
    const audioData = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputContext) {
      // Calculate fake volume for visualizer based on audio presence
      this.callbacks.onVolume(0.5); 
      
      this.nextStartTime = Math.max(this.nextStartTime, this.outputContext.currentTime);
      
      const audioBuffer = await decodeAudioData(
        base64ToUint8Array(audioData),
        this.outputContext
      );

      const source = this.outputContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode!);
      
      source.addEventListener('ended', () => {
        this.activeSources.delete(source);
      });

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.activeSources.add(source);
    }

    // 2. Handle Interruption
    if (serverContent?.interrupted) {
      this.activeSources.forEach(src => src.stop());
      this.activeSources.clear();
      this.nextStartTime = 0;
    }

    // 3. Handle Turn Complete (Transcription)
    if (serverContent?.turnComplete) {
       // Transcription handling
    }

    // 4. Handle Tool Calls
    if (toolCall) {
       for (const fc of toolCall.functionCalls) {
          const result = await executeTool(fc.name, fc.args);
          this.sessionPromise?.then(session => {
             session.sendToolResponse({
               functionResponses: {
                 id: fc.id,
                 name: fc.name,
                 response: result
               }
             });
          });
       }
    }
  }

  public disconnect() {
    // Close Audio Contexts
    this.inputContext?.close();
    this.outputContext?.close();
    
    // Stop Tracks
    this.inputSource?.mediaStream.getTracks().forEach(t => t.stop());
    
    // Disconnect Processor
    this.processor?.disconnect();
    
    // Cleanup sources
    this.callbacks.onStatusChange('disconnected');
    this.activeSources.forEach(s => s.stop());
    this.activeSources.clear();
  }
}
