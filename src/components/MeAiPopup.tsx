import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

const profileAvatar = "/src/assets/images/flower_avatar_1782704451351.jpg";

const SUGGESTIONS = [
  "Чи өөрийгөө танилцуулаач? 😊",
  "Дуртай тоглоомууд чинь юу вэ? 🎮",
  "IT инженер болон нисгэгч мөрөөдлийнхөө талаар яриач?",
  "Портфолио сайтынхаа хэсгүүдийг тайлбарлаач!"
];

export default function MeAiPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "model",
      text: "Сайн уу! Би бол Сайханбилэгийн AI хувилбар байна. Миний портфолио вэбсайт болон сонирхлуудын талаар юу мэдмээр байна? Асуу, асуу! ⚡👽",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Remove unread flag when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
    }
  }, [isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/chat/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        })
      });

      const data = await res.json();
      if (res.ok && data.text) {
        const modelMsg: Message = {
          id: Math.random().toString(),
          role: "model",
          text: data.text,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, modelMsg]);
      } else {
        const errorMsg: Message = {
          id: Math.random().toString(),
          role: "model",
          text: "Алдаа гарлаа. Дахин оролдоод үз дээ. 👾",
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error("Failed to chat with Me-AI:", err);
      const errorMsg: Message = {
        id: Math.random().toString(),
        role: "model",
        text: "Сүлжээ тасарчихлаа. Түр хүлээж байгаад дахин асуугаарай!",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div 
          className="w-[90vw] sm:w-[380px] h-[550px] max-h-[75vh] mb-4 rounded-2xl liquid-glass text-white shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-blur-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                <img 
                  src={profileAvatar} 
                  alt="Сайханбилэг (AI)" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-black animate-pulse"></span>
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                  Сайханбилэг (AI)
                  <Sparkles size={12} className="text-yellow-400" />
                </h4>
                <p className="text-[10px] text-green-400 font-mono">Идэвхтэй • ENFP-T 👽</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-yellow-500/10 border border-yellow-500/20 text-white rounded-tr-none"
                      : "bg-white/5 border border-white/10 text-gray-100 rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <span className="block text-[8px] text-gray-500 font-mono mt-1 text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white/5 border border-white/10 text-gray-400 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-2">
                  <div className="flex gap-1 shrink-0">
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span>Сайханбилэг бичиж байна...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          <div className="px-4 py-2 border-t border-white/5 bg-black/20 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
            {SUGGESTIONS.map((suggest, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(suggest)}
                disabled={loading}
                className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-300 px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {suggest}
              </button>
            ))}
          </div>

          {/* Input Panel */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 border-t border-white/10 bg-black/40 flex gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Сайханбилэгээс асуух..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-white/20 transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-yellow-500 hover:bg-yellow-600 text-black w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              <Send size={12} className="fill-black" />
            </button>
          </form>
        </div>
      )}

      {/* Circular Messenger Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative group w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-600 text-black flex items-center justify-center shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer active:scale-95"
        title="Сайханбилэгийн AI туслах"
        aria-label="Open chat assistant"
      >
        {isOpen ? (
          <X size={22} className="text-black" />
        ) : (
          <div className="relative w-full h-full p-0.5 rounded-full overflow-hidden">
            <img 
              src={profileAvatar} 
              alt="AI" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-yellow-400/20 mix-blend-color-dodge group-hover:bg-transparent transition-colors"></div>
            <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-yellow-500 animate-pulse animate-duration-1000"></div>
          </div>
        )}
      </button>
    </div>
  );
}
