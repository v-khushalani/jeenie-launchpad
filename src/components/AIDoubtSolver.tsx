import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  X,
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  Wand2,
  Bot,
  User,
  Clock,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { aiAPI } from "@/services/api/modules/ai";
import { aiQueue } from "@/services/api/queue";
import DOMPurify from "dompurify";
import { logger } from "@/utils/logger";
import { replaceGreekLetters } from "@/constants/unified";
import { renderLatex, containsLatex } from "@/utils/mathRenderer";
import 'katex/dist/katex.min.css';

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

interface AIDoubtSolverProps {
  question?: {
    question: string;
    option_a?: string;
    option_b?: string;
    option_c?: string;
    option_d?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const AIDoubtSolver: React.FC<AIDoubtSolverProps> = ({
  question,
  isOpen,
  onClose,
}) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const RATE_LIMIT_MS = 2000;
  const { isPremium } = useAuth();
  const isAIAvailable = useMemo(() => aiAPI.isAvailable(), []);

  useEffect(() => {
    setIsPro(isPremium);
  }, [isPremium]);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        const stats = aiQueue.getStats();
        setQueuePosition(stats.queueLength > 0 ? stats.queueLength : null);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setQueuePosition(null);
    }
  }, [loading]);

  const initialMessage = useMemo(() => {
    const isGeneral =
      !question?.option_a || question?.question?.includes("koi bhi");
    if (isGeneral) {
      return `**Hello Puttar!** 🧞‍♂️

Main hoon **JEEnie** — aapka personal AI mentor! 💙

🎯 Physics, Chemistry, Maths, Biology — kuch bhi pucho!
📸 Ya photo click karke apna doubt bhejo!`;
    } else {
      return `**Hello Puttar!** 🧞‍♂️

📌 **Question:** ${question.question}
${question.option_a ? `**A)** ${question.option_a}` : ""}
${question.option_b ? `**B)** ${question.option_b}` : ""}
${question.option_c ? `**C)** ${question.option_c}` : ""}
${question.option_d ? `**D)** ${question.option_d}` : ""}

💬 Apna doubt likho ya 📸 photo bhejo!`;
    }
  }, [question]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: initialMessage }]);
    }
  }, [isOpen, messages.length, initialMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const playSound = (tone: "send" | "receive") => {
    const audio = new Audio(
      tone === "send"
        ? "https://cdn.pixabay.com/download/audio/2022/03/15/audio_040b9c8d6b.mp3?filename=click-124467.mp3"
        : "https://cdn.pixabay.com/download/audio/2022/03/15/audio_8f27e7a46a.mp3?filename=notification-5-173230.mp3"
    );
    audio.volume = 0.25;
    audio.play().catch(() => {});
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image 5MB se chhota hona chahiye! 📸");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      // Extract base64 data (remove data:image/...;base64, prefix)
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildConversationHistory = (currentMessages: Message[]): string => {
    const recentMessages = currentMessages.slice(-6);
    if (recentMessages.length === 0) return "";
    
    return recentMessages.map(msg => {
      const role = msg.role === "user" ? "Student" : "JEEnie";
      const cleanContent = msg.content.replace(/<[^>]*>/g, '').substring(0, 300);
      return `${role}: ${cleanContent}`;
    }).join("\n");
  };

  const callEdgeFunction = async (prompt: string, conversationHistory: string, base64Image?: string): Promise<string> => {
    try {
      logger.info("Calling JEEnie via API layer...");
      
      const payload: any = {
        contextPrompt: prompt,
        conversationHistory: conversationHistory ? [
          { role: 'user', content: conversationHistory, timestamp: new Date().toISOString() }
        ] : undefined,
      };

      // Add image for vision processing
      if (base64Image) {
        payload.image = base64Image;
      }
      
      const { data, error: apiError } = await aiAPI.askJeenie(payload);
      
      if (apiError) {
        logger.error("API error from JEEnie:", apiError);
        const errorType = apiError.code;
        
        if (errorType === "RATE_LIMITED" || apiError.message.includes("rate")) {
          throw new Error("JEEnie abhi chai pe gaya hai! ☕ 2 second ruk, wapas aata hai!");
        } else if (apiError.message.includes("overloaded") || apiError.message.includes("unavailable")) {
          throw new Error("JEEnie ke neurons mein traffic jam! 🧠 Thoda patience, genius loading...");
        } else if (apiError.message.includes("timeout")) {
          throw new Error("JEEnie itna soch raha hai ki time hi nikal gaya! ⏰ Dobara pooch!");
        } else {
          throw new Error("Oho! JEEnie thoda confuse ho gaya! 🤪 Ek aur baar try kar, pakka answer dega!");
        }
      }
      
      if (!data || !data.response) {
        throw new Error("JEEnie ko kuch samajh nahi aaya! 😅 Thoda aur detail mein pooch!");
      }
      
      return data.response.trim();
      
    } catch (error) {
      logger.error("Error calling JEEnie Edge Function:", error);
      if (error instanceof Error) throw error;
      throw new Error("Internet connection check karo! 🌐 JEEnie se baat nahi ho pa rahi.");
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !imageBase64) return;
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Pehle login kar bhai! 🔑 JEEnie sirf apne students se baat karta hai.");
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastRequestTime)) / 1000);
      setError(`☕ JEEnie ${waitTime} second mein ready hoga! Thoda patience...`);
      return;
    }

    setLastRequestTime(now);
    setLoading(true);
    playSound("send");

    const userContent = input.trim() || (imageBase64 ? "📸 Photo se doubt solve karo" : "");
    const userMsg: Message = { role: "user", content: userContent, imageUrl: imagePreview || undefined };
    setMessages((prev) => [...prev, userMsg]);
    
    const currentImage = imageBase64;
    setInput("");
    clearImage();

    try {
      const isGeneral = !question?.option_a || question?.question?.includes("koi bhi");
      const history = buildConversationHistory(messages);
      
      let prompt: string;
      if (currentImage) {
        prompt = userContent !== "📸 Photo se doubt solve karo"
          ? `Student has shared a photo of their doubt along with this message: "${userContent}". Analyze the image carefully and solve the problem shown. Give detailed step-by-step solution.`
          : `Student has shared a photo of their doubt. Analyze the image carefully, identify the question/problem, and give a detailed step-by-step solution.`;
      } else if (isGeneral) {
        prompt = `Student's current doubt: "${userContent}". Give direct, on-point answer. No unnecessary elaboration.`;
      } else {
        prompt = `Question: ${question.question}
Options: A) ${question.option_a}, B) ${question.option_b}, C) ${question.option_c}, D) ${question.option_d}
Student's current doubt: "${userContent}". Give direct solution, explain only what's needed.`;
      }

      setTyping(true);
      const aiResponse = await callEdgeFunction(prompt, history, currentImage || undefined);
      const formatted = cleanAndFormatJeenieText(aiResponse);
      playSound("receive");
      setMessages((prev) => [...prev, { role: "assistant", content: formatted }]);
    } catch (error: any) {
      logger.error("Error in handleSendMessage:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "JEEnie ka chirag thoda garam ho gaya! 🧞‍♂️🔥 Ek minute ruk, thanda hone de!";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMessage }]);
    } finally {
      setTyping(false);
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-secondary/90 backdrop-blur-md z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-3">
      <div className="bg-background rounded-none sm:rounded-2xl shadow-2xl max-w-lg w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden border border-border relative">
        {/* Floating JEEnie Icon */}
        <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 bg-gradient-to-br from-accent-foreground to-primary p-2 sm:p-3 rounded-full shadow-lg animate-bounce">
          <Wand2 className="text-primary-foreground w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border bg-secondary/50 sm:rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <Bot className="text-accent-foreground" size={18} />
            <div>
              <h3 className="font-bold text-primary text-sm sm:text-base md:text-lg tracking-wide">
                JEEnie — AI Doubt Solver
              </h3>
              <p className="text-xs text-muted-foreground font-medium hidden sm:block">
                {!isAIAvailable ? (
                  <span className="text-amber-600">⏳ High demand - responses may be slower</span>
                ) : queuePosition ? (
                  <span className="text-blue-600">
                    <Clock size={10} className="inline mr-1" />
                    Queue position: {queuePosition}
                  </span>
                ) : (
                  "📸 Photo bhejo ya type karo • Smart • Fast"
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-primary/70 hover:text-primary hover:bg-secondary p-1.5 sm:p-2 rounded-lg transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-secondary/30 text-primary">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="bg-secondary p-1.5 sm:p-2 rounded-full mr-1.5 sm:mr-2 flex-shrink-0">
                  <Bot className="text-accent-foreground" size={14} />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[80%] p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-accent-foreground to-primary text-primary-foreground rounded-br-sm"
                    : "bg-background border border-border text-primary rounded-bl-sm"
                }`}
              >
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Uploaded doubt" 
                    className="w-full max-h-40 object-contain rounded-lg mb-2 border border-primary-foreground/20"
                  />
                )}
                <div
                  className="text-xs sm:text-sm"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(msg.content),
                  }}
                />
              </div>
              {msg.role === "user" && (
                <div className="bg-secondary p-1.5 sm:p-2 rounded-full ml-1.5 sm:ml-2 flex-shrink-0">
                  <User className="text-primary" size={14} />
                </div>
              )}
            </div>
          ))}

          {typing && (
            <div className="flex justify-start items-center gap-2 text-accent-foreground">
              <div className="bg-background border border-border px-3 py-2 rounded-2xl shadow-sm flex gap-1 items-center">
                <span className="w-2 h-2 bg-accent-foreground rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-accent-foreground/80 rounded-full animate-bounce delay-100"></span>
                <span className="w-2 h-2 bg-accent-foreground/60 rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="px-3 pt-2 bg-secondary/30 border-t border-border">
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="h-16 w-auto rounded-lg border border-border shadow-sm"
              />
              <button
                onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-2.5 sm:p-3 border-t border-border bg-secondary/30 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3">
          <div className="flex gap-1.5 sm:gap-2 items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 border-border hover:bg-secondary text-accent-foreground h-9 w-9 sm:h-10 sm:w-10"
              title="📸 Photo se doubt pucho"
            >
              <Camera size={16} />
            </Button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={imageBase64 ? "Kuch likhna hai toh likho... (optional)" : "Apna doubt likho ya 📸 photo bhejo..."}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-background border border-border rounded-lg sm:rounded-xl text-primary placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-xs sm:text-sm transition-all"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || (!input.trim() && !imageBase64)}
              className="bg-gradient-to-r from-accent-foreground to-primary hover:opacity-90 text-primary-foreground px-3 sm:px-6 rounded-lg sm:rounded-xl transition-all shadow-md h-auto"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
          <p className="text-center text-[10px] sm:text-[11px] text-muted-foreground mt-1.5 sm:mt-2">
            📸 Photo-to-Doubt • 💎 Powered by <strong>JEEnie AI</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

function cleanAndFormatJeenieText(text: string, isFirstResponse: boolean = false): string {
  let formatted = text;
  
  if (!isFirstResponse) {
    formatted = formatted
      .replace(/\*?\*?Hello Puttar!?\*?\*?\s*🧞‍♂️?\s*/gi, '')
      .replace(/Hello Puttar!?\s*/gi, '')
      .replace(/^[\s\n]*/, '');
  }
  
  formatted = replaceGreekLetters(formatted);
  
  formatted = formatted
    .replace(/->/g, '→')
    .replace(/<-/g, '←')
    .replace(/<=>/g, '⇌')
    .replace(/>=/g, '≥')
    .replace(/<=/g, '≤')
    .replace(/!=/g, '≠')
    .replace(/~=/g, '≈')
    .replace(/\^2(?![0-9])/g, '²')
    .replace(/\^3(?![0-9])/g, '³')
    .replace(/\+-/g, '±')
    .replace(/H2O/g, 'H₂O')
    .replace(/CO2/g, 'CO₂')
    .replace(/O2(?![0-9])/g, 'O₂')
    .replace(/N2(?![0-9])/g, 'N₂')
    .replace(/H2(?![0-9O])/g, 'H₂')
    .replace(/SO4/g, 'SO₄')
    .replace(/NO3/g, 'NO₃')
    .replace(/NH3/g, 'NH₃')
    .replace(/CH4/g, 'CH₄')
    .replace(/H2SO4/g, 'H₂SO₄')
    .replace(/HNO3/g, 'HNO₃')
    .replace(/([A-Za-z])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-primary">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/• /g, '<span class="text-accent-foreground">•</span> ')
    .replace(/🎯/g, '<span style="font-size: 1.1em;">🎯</span>')
    .replace(/💡/g, '<span style="font-size: 1.1em;">💡</span>')
    .replace(/✨/g, '<span style="font-size: 1.1em;">✨</span>')
    .replace(/⚡/g, '<span style="font-size: 1.1em;">⚡</span>')
    .replace(/🔥/g, '<span style="font-size: 1.1em;">🔥</span>')
    .replace(/📌/g, '<span style="font-size: 1.1em;">📌</span>')
    .replace(/✅/g, '<span style="font-size: 1.1em;">✅</span>');

  // Render LaTeX: $$...$$ (display) and $...$ (inline) via KaTeX
  if (formatted.includes('$') || containsLatex(formatted)) {
    // Process display math $$...$$
    formatted = formatted.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => renderLatex(`$$${latex}$$`));
    // Process inline math $...$
    formatted = formatted.replace(/\$([^$]+)\$/g, (full, latex) => {
      if (/^\s*\d+(\.\d+)?\s*$/.test(latex)) return full; // skip currency
      return renderLatex(`$${latex}$`);
    });
    // If no $ but has LaTeX commands, render the whole thing
    if (!formatted.includes('$') && !formatted.includes('class="katex"') && containsLatex(formatted)) {
      formatted = renderLatex(formatted);
    }
  }
  
  return formatted.trim();
}

export default AIDoubtSolver;
