import { useState, useEffect } from "react";
import { MOVIE_SLIDES } from "./types";
import Navbar from "./components/Navbar";
import MobileMenu from "./components/MobileMenu";
import HeroContent from "./components/HeroContent";
import MinecraftRunner from "./components/MinecraftRunner";
import IdolCoachModal from "./components/IdolCoachModal";
import MeAiPopup from "./components/MeAiPopup";
import { Search, User, X, Film, Sparkles, CheckCircle, Gamepad2, ArrowLeft, Play } from "lucide-react";

const profileAvatar = "/src/assets/images/flower_avatar_1782704451351.jpg";

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Custom interaction states (for the search/profile popups)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isIdolModalOpen, setIsIdolModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Game Integration States
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<"among-us" | "geometry-dash" | null>(null);

  const activeSlide = MOVIE_SLIDES[activeIndex];

  // Auto-slide transition is disabled by default to give full control over manual next/prev,
  // but let's make sure our video plays perfectly and smoothly.
  
  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? MOVIE_SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === MOVIE_SLIDES.length - 1 ? 0 : prev + 1));
  };

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handlePlayNow = () => {
    setIsGameModalOpen(true);
    triggerToast("Minecraft Diamond Dash тоглоом ачааллаа! 🎮");
  };

  const handleLearnMore = () => {
    setIsProfileOpen(true);
    triggerToast("Сайханбилэгийн тухай дэлгэрэнгүй мэдээллийг нээлээ! ⚡");
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans overflow-hidden flex flex-col hero-bg-gradient">
      
      {/* 1. BACKGROUND VIDEO (z-0) */}
      <video
        key="hero-bg-video"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-85"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_094145_4a271a6c-3869-4f1c-8aa7-aeb0cb227994.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* 2. BOTTOM BLUR OVERLAY (z-1) - REFITTED TO 24PX BACKDROP BLUR */}
      <div 
        id="bottom-blur-backdrop"
        className="fixed inset-0 w-full h-full backdrop-blur-[24px] blur-overlay-mask pointer-events-none z-1"
      />

      {/* 3. TOP-DOWN GLOW GRADIENT ACCENT (Subtle, professional and non-intrusive) */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-1" />

      {/* 4. NAVBAR (z-50) */}
      <Navbar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        onSearchClick={() => setIsSearchOpen(true)}
        onProfileClick={() => setIsProfileOpen(true)}
        onIdolClick={() => {
          setIsIdolModalOpen(true);
          setIsMenuOpen(false);
        }}
      />

      {/* 5. MOBILE DROPDOWN MENU (z-40) */}
      <MobileMenu
        isOpen={isMenuOpen}
        onSearchClick={() => {
          setIsMenuOpen(false);
          setIsSearchOpen(true);
        }}
        onProfileClick={() => {
          setIsMenuOpen(false);
          setIsProfileOpen(true);
        }}
        onIdolClick={() => {
          setIsIdolModalOpen(true);
          setIsMenuOpen(false);
        }}
      />

      {/* 6. PRIMARY HERO CONTENT (z-10) */}
      <HeroContent
        activeSlide={activeSlide}
        onPrev={handlePrev}
        onNext={handleNext}
        onPlayNow={handlePlayNow}
        onLearnMore={handleLearnMore}
      />

      {/* =========================================================================
          INTERACTIVE ELEMENTS (Modals and Toasts) 
          All styled with .liquid-glass to maintain premium unified aesthetics 
          ========================================================================= */}

      {/* A. Search Modal */}
      {isSearchOpen && (
        <div id="search-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div 
            id="search-modal-container"
            className="w-full max-w-xl p-6 rounded-2xl liquid-glass text-white shadow-2xl relative border border-white/10 animate-blur-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Search size={20} className="text-gray-300" />
                <h3 className="text-lg font-semibold tracking-wide">Search Cinematic Library</h3>
              </div>
              <button 
                id="btn-close-search"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Input Bar */}
            <div className="relative mb-6">
              <input
                id="input-search-query"
                type="text"
                placeholder="Search movies, series, directors, genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white/20 transition-all font-light"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim() !== "") {
                    triggerToast(`Searching for: "${searchQuery}"`);
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
              />
              <button 
                id="btn-submit-search"
                onClick={() => {
                  if (searchQuery.trim() !== "") {
                    triggerToast(`Searching for: "${searchQuery}"`);
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <Search size={18} />
              </button>
            </div>

            {/* Recommendations / History */}
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-3">Trending Searches</p>
              <div className="flex flex-wrap gap-2">
                {["Forgotten Realms", "Odyssey", "Tokyo Noir", "Sci-Fi Thriller", "Interstellar"].map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      triggerToast(`Searching for: "${term}"`);
                      setIsSearchOpen(false);
                    }}
                    className="text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-lg transition-all border border-white/5 cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. Profile Modal */}
      {isProfileOpen && (
        <div id="profile-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div 
            id="profile-modal-container"
            className="w-full max-w-sm p-6 rounded-2xl liquid-glass text-white shadow-2xl relative border border-white/10 animate-blur-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <User size={20} className="text-gray-300" />
                <h3 className="text-lg font-semibold tracking-wide">User Profile</h3>
              </div>
              <button 
                id="btn-close-profile"
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Detail Card */}
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/15 relative group">
                <img 
                  src={profileAvatar} 
                  alt="Сайханбилэгийн Minecraft Дүр" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h4 className="text-xl font-bold text-white tracking-wide">Сайханбилэг</h4>
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1 justify-center bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                <Sparkles size={12} className="fill-yellow-400" />
                <span>12 Настай • Алтан гишүүн</span>
              </p>

              {/* Bio & Details */}
              <div className="w-full mt-5 space-y-3 text-left bg-white/5 p-4 rounded-xl border border-white/10 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-gray-400 text-xs uppercase font-medium">Дуртай тоглоом:</span>
                  <span className="text-white font-medium">Minecraft, Roblox, Standoff 🎮</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-gray-400 text-xs uppercase font-medium">Хобби:</span>
                  <span className="text-white font-medium">Волейбол 🏐</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-gray-400 text-xs uppercase font-medium">Дуртай кино:</span>
                  <span className="text-white font-medium">Хэрри Поттер ⚡</span>
                </div>
                <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                  <span className="text-gray-400 text-xs uppercase font-medium">Дуртай дуу:</span>
                  <a 
                    href="https://g.co/gemini/share/56a86724122d"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300 font-medium flex items-center gap-1.5 transition-colors group/song"
                  >
                    <span className="animate-pulse">🎵</span>
                    <span className="underline underline-offset-4 decoration-yellow-400/30 group-hover/song:decoration-yellow-400">Сайханбилэгийн дууг сонсох</span>
                    <span className="text-[10px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-1.5 py-0.5 rounded font-normal shrink-0">Линк</span>
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs uppercase font-medium">Имэйл:</span>
                  <span className="text-white text-xs font-mono">ezkasaikhan@gmail.com</span>
                </div>
              </div>

              {/* Info Stats */}
              <div className="grid grid-cols-2 gap-4 w-full mt-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <span className="block text-xl font-semibold font-mono">324</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Үзсэн</span>
                </div>
                <div className="text-center">
                  <span className="block text-xl font-semibold font-mono">58</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Сэтгэгдэл</span>
                </div>
              </div>
            </div>

            {/* Simple logout/preference actions */}
            <div className="mt-4 flex flex-col gap-2">
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  triggerToast("Preferences saved successfully!");
                }}
                className="w-full bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
              >
                Account Settings
              </button>
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  triggerToast("Logged out of session (Mock)");
                }}
                className="w-full text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Modal - Interactive Minecraft Diamond Dash */}
      {isGameModalOpen && (
        <div id="game-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div 
            id="game-modal-container"
            className="w-full max-w-4xl p-6 rounded-2xl liquid-glass text-white shadow-2xl relative border border-white/10 flex flex-col justify-between animate-blur-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Gamepad2 size={24} className="text-yellow-400" />
                <div>
                  <h3 className="text-xl font-bold tracking-wide flex items-center gap-2">
                    Minecraft Diamond Dash
                    <span className="text-[10px] bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded font-mono font-normal">
                      Play Now
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Сайханбилэгийн дуртай Minecraft болон Runner тоглоомуудын нэгдэл
                  </p>
                </div>
              </div>
              <button 
                id="btn-close-game-modal"
                onClick={() => {
                  setIsGameModalOpen(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 flex flex-col items-center justify-center overflow-hidden min-h-[350px] w-full">
              <MinecraftRunner />
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 pt-4 mt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-3">
              <div>
                <span className="flex items-center gap-1.5 text-green-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  100% Апп дотроо шууд ажиллах тоглоом
                </span>
              </div>
              <div className="flex gap-4">
                <span>Сайханбилэг 12 Нас ⚡</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* C. Interactive Glass Toast Notifications */}
      {showToast && (
        <div 
          id="toast-notification"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl liquid-glass border border-white/10 shadow-2xl animate-blur-fade-up pointer-events-auto"
          style={{ animationDelay: "0ms" }}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10">
            <CheckCircle size={18} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest leading-none mb-1">Success</p>
            <p className="text-sm font-medium text-white">{toastMessage}</p>
          </div>
          <button 
            onClick={() => setShowToast(false)}
            className="text-white/40 hover:text-white transition-colors ml-2"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* D. Idol Coach Modal */}
      <IdolCoachModal isOpen={isIdolModalOpen} onClose={() => setIsIdolModalOpen(false)} />

      {/* E. Messenger-style Me-AI Assistant Popup */}
      <MeAiPopup />

    </div>
  );
}
