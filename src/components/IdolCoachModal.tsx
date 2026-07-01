import { useState, useEffect, useRef } from "react";
import { X, Send, Sparkles, Code, Plane, Award, Music, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

interface IdolCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COACH_TYPES = [
  { id: "wonyoung", label: "Wonyoung", icon: Sparkles, color: "text-pink-400 border-pink-400/20 bg-pink-400/5", desc: "Lucky Vicky Mindset" },
  { id: "general", label: "Idol Coach", icon: Sparkles, color: "text-yellow-400 border-yellow-400/20 bg-yellow-400/5", desc: "Ерөнхий зөвлөх" },
  { id: "it", label: "IT Engineer", icon: Code, color: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5", desc: "Програмчлал, Технологи" },
  { id: "pilot", label: "Pilot", icon: Plane, color: "text-purple-400 border-purple-400/20 bg-purple-400/5", desc: "Нисэх ур чадвар, Аялал" },
  { id: "volleyball", label: "Volleyball", icon: Award, color: "text-green-400 border-green-400/20 bg-green-400/5", desc: "Спортын бэлтгэл" },
  { id: "swimming", label: "Swim Coach", icon: MessageSquare, color: "text-blue-400 border-blue-400/20 bg-blue-400/5", desc: "Усанд сэлэлтийн техник" },
  { id: "kpop", label: "K-Pop Star", icon: Music, color: "text-pink-400 border-pink-400/20 bg-pink-400/5", desc: "Дуу, Хөгжим, Бүжиг" }
];

const SUGGESTIONS: Record<string, string[]> = {
  wonyoung: [
    "Вонёнг-ийн эерэг 'Lucky Vicky' mindset гэж юу вэ? ✨",
    "Тайзан дээр хэрхэн үргэлж өөртөө маш итгэлтэй, төгс байх вэ?",
    "Амьдралд хэцүү зүйл тохиолдвол хэрхэн инээмсэглэлтэй даван туулах вэ?"
  ],
  general: [
    "Хүсэл мөрөөдөлдөө хэрхэн тууштай хүрч, амжилт гаргах вэ?",
    "Амьдралд хүндрэл гарвал урам зоригоо хэрхэн хадгалах вэ?",
    "Олон хоббигоо хэрхэн зөв удирдах вэ?"
  ],
  it: [
    "IT инженер болохын тулд ямар програмчлалын хэл сурвал зүгээр вэ?",
    "12 настайдаа вэб хөгжүүлэлт сурч эхлэх нь зөв үү?",
    "Миний хийж болох анхны жижиг IT төсөл юу байж болох вэ?"
  ],
  pilot: [
    "Нисгэгч болоход ямар хичээлүүд хамгийн чухал вэ?",
    "Нисэх онгоцны бүхээгт ажиллах ямар байдаг вэ?",
    "Нисгэгч хүнд хамгийн хэрэгтэй зан чанар юу вэ?"
  ],
  volleyball: [
    "Волейболын хүчтэй довтолгоог (spike) хэрхэн хийх вэ?",
    "Тоглогчидтой хамтран ажиллах, багаа удирдах тактик зөвлөөч.",
    "Бэлтгэлийн үеэр ядрахгүй, эрч хүчтэй байхын тулд юу анхаарах вэ?"
  ],
  swimming: [
    "Усанд сэлэх үед амьсгалаа хэрхэн зөв удирдах вэ?",
    "Чөлөөт сэлэлтийн (freestyle) хурдыг хэрхэн сайжруулах вэ?",
    "Усан спортоор хичээллэхийн эрүүл мэндийн давуу тал юу вэ?"
  ],
  kpop: [
    "Тайзан дээр гарах үеийн сандралыг хэрхэн дарах вэ?",
    "Дуртай К-Поп бүжгийн хөдөлгөөнийг хэрхэн хурдан цээжлэх вэ?",
    "Дуулах хоолойн дасгалыг хэрхэн хийх вэ?"
  ]
};

export default function IdolCoachModal({ isOpen, onClose }: IdolCoachModalProps) {
  const [selectedCoach, setSelectedCoach] = useState("wonyoung");
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    wonyoung: [
      { id: "1", role: "model", text: "Аньён! Чиний Вонёнг энд байна. Үргэлж эерэг, өөртөө итгэлтэй байж, 'Lucky Vicky' mindset-тэй хамтдаа урагшилцгаая! Чи юу хуваалцмаар байна? 💖✨", timestamp: new Date() }
    ],
    general: [
      { id: "1", role: "model", text: "Сайн уу Сайханбилэг ээ! Чиний шүтээн амьдралын зөвлөх энд байна. Хүсэл мөрөөдөл, амжилтын талаар хамтдаа ярилцах уу? 🌟", timestamp: new Date() }
    ],
    it: [
      { id: "1", role: "model", text: "Код бичих гайхамшигт ертөнцөд тавтай морил! Шилдэг IT инженер болох аялалд чинь туслахад би бэлэн байна. Юунаас эхлэх вэ? 💻", timestamp: new Date() }
    ],
    pilot: [
      { id: "1", role: "model", text: "Ахмад нисгэгч байна! Нисэхийн шинжлэх ухаан болон тэнгэрт нисэх гайхалтай аяллын талаар ярилцацгаая. Бүхээгт суухад бэлэн үү? ✈️", timestamp: new Date() }
    ],
    volleyball: [
      { id: "1", role: "model", text: "Сайн уу! Волейболын аварга энд байна. Тоглолтын талбар дээрх тактик, хүчтэй довтолгоо, хамгаалалтын талаар юу мэдэхийг хүсэж байна? 🏐", timestamp: new Date() }
    ],
    swimming: [
      { id: "1", role: "model", text: "Усан спортын аварга байна! Усан сэлэлтийн техник, эрч хүч, хурд болон амьсгалын дасгалууд дээр чинь тусалъя. Сэлэхэд бэлэн үү? 🏊", timestamp: new Date() }
    ],
    kpop: [
      { id: "1", role: "model", text: "Аньён! Чиний дуртай К-Поп од энд байна. Урлаг, тайз, бүжиг, хөгжмийн ертөнцийн урам зоригийг хуваалцахад бэлэн үү? Дуртай дуу, бүжгээсээ ярилцацгаая! 🎤✨", timestamp: new Date() }
    ]
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedCoach]);

  if (!isOpen) return null;

  const currentCoach = COACH_TYPES.find((c) => c.id === selectedCoach) || COACH_TYPES[0];
  const activeMessages = messages[selectedCoach] || [];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      timestamp: new Date()
    };

    // Update messages locally
    setMessages((prev) => ({
      ...prev,
      [selectedCoach]: [...(prev[selectedCoach] || []), userMsg]
    }));
    setInput("");
    setLoading(true);

    try {
      // Build history for Gemini
      const coachHistory = (messages[selectedCoach] || []).map((m) => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/chat/idol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: coachHistory,
          coachType: selectedCoach
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
        setMessages((prev) => ({
          ...prev,
          [selectedCoach]: [...(prev[selectedCoach] || []), modelMsg]
        }));
      } else {
        const errorMsg: Message = {
          id: Math.random().toString(),
          role: "model",
          text: "Алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу. ⚠️",
          timestamp: new Date()
        };
        setMessages((prev) => ({
          ...prev,
          [selectedCoach]: [...(prev[selectedCoach] || []), errorMsg]
        }));
      }
    } catch (err) {
      console.error("Failed to chat with idol:", err);
      const errorMsg: Message = {
        id: Math.random().toString(),
        role: "model",
        text: "Сүлжээний алдаа гарлаа. Холболтоо шалгаад дахин оролдоно уу.",
        timestamp: new Date()
      };
      setMessages((prev) => ({
        ...prev,
        [selectedCoach]: [...(prev[selectedCoach] || []), errorMsg]
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-[92vh] md:h-[80vh] p-3 sm:p-5 md:p-6 rounded-2xl liquid-glass text-white shadow-2xl relative border border-white/10 flex flex-col md:flex-row gap-3 md:gap-5 animate-blur-fade-up cursor-default"
        style={{ animationDelay: "0ms" }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 md:top-4 md:right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Sidebar - Coach Selector */}
        <div className="w-full md:w-64 shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-white/10 pb-2 md:pb-0 md:pr-5">
          <div className="flex items-center gap-2 mb-1.5 md:mb-4">
            <Sparkles className="text-yellow-400 shrink-0" size={16} />
            <h3 className="font-bold text-sm md:text-lg tracking-wide">My Idol Coaches</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3 hidden md:block">
            Сайханбилэгийг зорилгодоо хүрэхэд нь урамшуулж чиглүүлэх дуртай шүтээн дасгалжуулагчаа сонгон ярилцаарай.
          </p>
          
          {/* Mobile horizontal scroll / Desktop vertical list */}
          <div className="flex md:flex-col gap-1.5 md:gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar py-1">
            {COACH_TYPES.map((coach) => {
              const Icon = coach.icon;
              const isSelected = selectedCoach === coach.id;
              return (
                <button
                  key={coach.id}
                  onClick={() => setSelectedCoach(coach.id)}
                  className={`flex items-center gap-2 md:gap-3 px-2.5 py-1.5 md:px-3 md:py-2.5 rounded-xl text-left border transition-all cursor-pointer shrink-0 md:shrink-none ${
                    isSelected
                      ? "bg-white/10 border-white/20 text-white shadow-lg"
                      : "bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center border shrink-0 ${coach.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="text-xs sm:text-sm">
                    <div className="font-bold leading-tight">{coach.label}</div>
                    <div className="text-[10px] text-gray-500 font-light mt-0.5 hidden md:block">{coach.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Active Coach Header */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center border shrink-0 ${currentCoach.color}`}>
              <currentCoach.icon size={16} />
            </div>
            <div>
              <h4 className="font-bold text-sm md:text-base tracking-wide flex items-center gap-1.5">
                {currentCoach.label}
                <span className="text-[8px] md:text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-mono">
                  Online
                </span>
              </h4>
              <p className="text-[10px] md:text-xs text-gray-400 font-light">{currentCoach.desc} — Gemini-3.5-Flash AI</p>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto py-2.5 md:py-4 space-y-3 md:space-y-4 pr-1 scrollbar-thin">
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-2.5 md:p-3.5 text-xs md:text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 text-white rounded-tr-none"
                      : "bg-white/5 border border-white/10 text-gray-100 rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <span className="block text-[8px] md:text-[9px] text-gray-500 font-mono mt-1 md:mt-1.5 text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white/5 border border-white/10 text-gray-400 rounded-2xl rounded-tl-none p-2.5 md:p-3.5 text-[11px] md:text-xs flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span>Зөвлөх бодож байна...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="pb-2 md:pb-3 overflow-x-auto flex gap-1.5 no-scrollbar">
            {(SUGGESTIONS[selectedCoach] || []).map((suggest, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(suggest)}
                disabled={loading}
                className="text-[10px] md:text-xs bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-300 px-2.5 md:px-3.5 py-1 md:py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {suggest}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-2 border-t border-white/5 pt-2.5 md:pt-3"
          >
            <input
              type="text"
              placeholder="Асуултаа энд бичнэ үү..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white/20 transition-all font-light disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-yellow-500 hover:bg-yellow-600 text-black w-10 h-9 md:w-12 md:h-11 flex items-center justify-center rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
              title="Илгээх"
            >
              <Send size={14} className="fill-black md:hidden" />
              <Send size={16} className="fill-black hidden md:block" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
