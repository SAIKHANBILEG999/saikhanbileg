import { useState, useEffect } from "react";
import { MOVIE_SLIDES } from "./types";
import Navbar from "./components/Navbar";
import MobileMenu from "./components/MobileMenu";
import HeroContent from "./components/HeroContent";
import IdolCoachModal from "./components/IdolCoachModal";
import MeAiPopup from "./components/MeAiPopup";
import AnimeGuesser from "./components/AnimeGuesser";
import Typeracer from "./components/Typeracer";
import BoatRacing from "./components/BoatRacing";
import SwimmingRace from "./components/SwimmingRace";
import Leaderboard from "./components/Leaderboard";
import ContentSections from "./components/ContentSections";
import { Search, User, X, Film, Sparkles, CheckCircle, Gamepad2, ArrowLeft, Play, Mic, Camera, Globe, TrendingUp, ExternalLink, Trophy } from "lucide-react";

const profileAvatar = "/src/assets/images/flower_avatar_1782704451351.jpg";

interface SearchItem {
  id: string;
  title: string;
  category: string;
  url: string;
  snippet: string;
  action: string;
  rating?: string;
  image?: string;
  extra?: Record<string, string>;
}

const SEARCHABLE_DATA: SearchItem[] = [
  {
    id: "volleyball",
    title: "Волейбол: Алтан Смэш (Volleyball: The Golden Spike)",
    category: "Спорт & Хобби",
    url: "https://cinematic.mn/hobbies/volleyball",
    snippet: "12 настай Сайханбилэгийн дуртай спорт болох волейболын хүч чадал, багийн тоглолт, ялалтын төлөөх тэмүүлэл.",
    rating: "9.5/10",
    image: "https://images.unsplash.com/photo-1592656094270-681f95a09635?q=80&w=300&auto=format&fit=crop",
    action: "play-volleyball",
    extra: {
      "Төрөл": "Спорт, Хөдөлгөөн, Багийн ажиллагаа",
      "Тоглогчид": "6vs6",
      "Ивээн тэтгэгч": "Сайханбилэг"
    }
  },
  {
    id: "roblox",
    title: "Roblox: Infinite Worlds (Роблокс)",
    category: "Тоглоом",
    url: "https://cinematic.mn/games/roblox",
    snippet: "Сайханбилэгийн хамгийн дуртай тоглоом! Төгсгөлгүй олон сонирхолтой ертөнцөөр аялж, өөрийн хүссэн тоглоомыг бүтээн найзуудтайгаа хамт тоглох боломжтой платформ.",
    rating: "10/10",
    image: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?q=80&w=300&auto=format&fit=crop",
    action: "play-roblox",
    extra: {
      "Хөгжүүлэгч": "Roblox Corporation",
      "Төрөл": "Платформ, Хамтын тоглоом, Бүтээлч",
      "Тоглодог": "Сайханбилэг хамгийн дуртай"
    }
  },
  {
    id: "standoff",
    title: "Standoff 2: Tactical Battle (Стандофф)",
    category: "Тоглоом",
    url: "https://cinematic.mn/games/standoff",
    snippet: "Сайханбилэгийн дуртай тактикийн буудалт тоглоом! Өндөр ур чадвар, багаараа хамтран ажиллах тактик болон хурдан хариу үйлдэл шаардсан гайхалтай тоглоом.",
    rating: "9.8/10",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop",
    action: "play-standoff",
    extra: {
      "Төрөл": "Буудагч, Тактик, Бодит цагийн",
      "Платформ": "Гар утас, Компьютер",
      "Үнэлгээ": "Эрэлттэй тоглоом"
    }
  },
  {
    id: "anime-guesser",
    title: "Anime Guesser: Зургаар Анимэ Таах Тоглоом",
    category: "Тоглоом & Апп",
    url: "https://cinematic.mn/apps/anime-guesser",
    snippet: "Дуртай анимэ болон баатруудын зургаар тааж, хамгийн өндөр оноог цуглуулан тэргүүлэгчдийн самбарт бичигдээрэй! Төгс шийдэл бүхий анимэ таагч.",
    rating: "9.9/10",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=300&auto=format&fit=crop",
    action: "launch-anime",
    extra: {
      "Хөгжүүлсэн": "Cinematic AI баг",
      "Төрөл": "Викторин, Анимэ, Оньсого",
      "Сэдвүүд": "Naruto, One Piece, Demon Slayer, Attack on Titan"
    }
  },
  {
    id: "typeracer",
    title: "Typeracer: Монгол хэлээр Хурдан Бичих Тэмцээн",
    category: "Тоглоом & Апп",
    url: "https://cinematic.mn/apps/typeracer",
    snippet: "Монгол хэл дээр хурдан бичих чадвараа сорьж, өрөө үүсгэн найзуудтайгаа бодит цагт уралдаж хурдаа гайхуулаарай! Multiplayer дэмждэг.",
    rating: "9.7/10",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=300&auto=format&fit=crop",
    action: "launch-typeracer",
    extra: {
      "Төрөл": "Уралдаан, Хурд сорих, Сүлжээний тоглоом",
      "Дэмжих хэл": "Монгол (Монгол кирилл хурд соригч)",
      "Интеграци": "Firestore Realtime Sync"
    }
  },
  {
    id: "idol-coaches",
    title: "My Idol Coaches: AI Зөвлөх Дасгалжуулагч",
    category: "AI Апп",
    url: "https://cinematic.mn/apps/idol-coach",
    snippet: "Сайханбилэгийн дуртай Idol-ууд болох Wonyoung (Lucky Vicky), IT Engineer, Pilot эсвэл Вэбсайтын ерөнхий зөвлөхтэй шууд харилцаж зөвлөгөө урам зориг аваарай.",
    rating: "10/10",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop",
    action: "launch-idol",
    extra: {
      "Модел": "Gemini 3.5 Flash AI",
      "Баатрууд": "Wonyoung, IT Coach, Pilot, Volleyball Coach",
      "Орчин": "Шууд чатлах, асуулт асуух"
    }
  },
  {
    id: "saikhanbileg",
    title: "Сайханбилэг: Бүтээлч Залуу, Вэб Эзэмшигч",
    category: "Хүн",
    url: "https://cinematic.mn/profile/saikhanbileg",
    snippet: "12 настай, волейбол тоглох, Roblox болон Standoff тоглох дуртай, бүтээлч, авьяаслаг залуу бүтээгч Сайханбилэг. Энэхүү Cinematic вэбсайтын эзэн.",
    rating: "Үнэлж баршгүй",
    image: "/src/assets/images/flower_avatar_1782704451351.jpg",
    action: "open-profile",
    extra: {
      "Нас": "12 настай",
      "Дуртай Сэдэв": "Магик, Волейбол, Roblox, Стандофф",
      "Үүрэг": "Бүтээгч, Хөгжүүлэгч"
    }
  },
  {
    id: "blackpink",
    title: "BLACKPINK (Блэкпинк) - Түүх, гишүүд, хит дуунууд",
    category: "К-поп",
    url: "https://kpop.fandom.com/wiki/BLACKPINK",
    snippet: "YG Entertainment-ийн дор 2016 онд дебютээ хийсэн Өмнөд Солонгосын алдарт охидын хамтлаг. Гишүүд: Жисү, Жэнни, Ружэ, Лиза.",
    rating: "10/10",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop",
    action: "launch-idol",
    extra: {
      "Агентлаг": "YG Entertainment",
      "Дебют": "2016 он 8-р сарын 8",
      "Гишүүд": "Jisoo, Jennie, Rosé, Lisa",
      "Хит дуунууд": "DDU-DU DDU-DU, Kill This Love, How You Like That"
    }
  },
  {
    id: "babymonster",
    title: "BABYMONSTER (Бэйбимонстер) - Шинэ үеийн К-поп охидын хамтлаг",
    category: "К-поп",
    url: "https://kpop.fandom.com/wiki/BABYMONSTER",
    snippet: "YG Entertainment-ийн шинээр гаргасан охидын хамтлаг. Дуу хоолой, реп, бүжгийн ур чадвараараа дэлхийд гайхагдаж буй шилдэг залуу хамтлаг.",
    rating: "9.9/10",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop",
    action: "launch-idol",
    extra: {
      "Агентлаг": "YG Entertainment",
      "Дебют": "2023 он",
      "Хит дуунууд": "BATTER UP, SHEESH, LIKE THAT"
    }
  },
  {
    id: "bts",
    title: "BTS (БТС) - Дэлхийг байлдан дагуулсан К-поп хамтлаг",
    category: "К-поп",
    url: "https://kpop.fandom.com/wiki/BTS",
    snippet: "BIGHIT MUSIC-ийн дор үйл ажиллагаа явуулдаг, дэлхийн хөгжмийн чартуудыг тэргүүлэгч, Грэммид нэр дэвшсэн хамгийн анхны Өмнөд Солонгосын хөвгүүдийн хамтлаг.",
    rating: "10/10",
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=300&auto=format&fit=crop",
    action: "launch-idol",
    extra: {
      "Агентлаг": "BIGHIT MUSIC (HYBE)",
      "Дебют": "2013 он 6-р сарын 13",
      "Гишүүд": "RM, Jin, Suga, J-Hope, Jimin, V, Jungkook",
      "Хит дуунууд": "Dynamite, Butter, Boy With Luv"
    }
  },
  {
    id: "newjeans",
    title: "NewJeans (Ньюжинс) - Сэргэг, өвөрмөц өнгө аястай хамтлаг",
    category: "К-поп",
    url: "https://kpop.fandom.com/wiki/NewJeans",
    snippet: "ADOR агентлагийн охидын хамтлаг. Хялбар сонсголонтой Y2K поп болон R&B хөгжмийн хэв маягийг дэлхийн сонсогчдод хүргэж буй топ хамтлаг.",
    rating: "9.9/10",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop",
    action: "launch-idol",
    extra: {
      "Агентлаг": "ADOR (HYBE)",
      "Дебют": "2022 он 7-р сарын 22",
      "Гишүүд": "Minji, Hanni, Danielle, Haerin, Hyein",
      "Хит дуунууд": "Attention, Hype Boy, Ditto, Super Shy"
    }
  },
  {
    id: "ive",
    title: "IVE (Айв) - Чин сэтгэлийн гэрэлтсэн хатан хаад",
    category: "К-поп",
    url: "https://kpop.fandom.com/wiki/IVE",
    snippet: "Starship Entertainment-ийн охидын хамтлаг. Шилдэг гишүүд болох Jang Wonyoung болон An Yujin нараар ахлуулсан, хамгийн алдартай К-поп хамтлагуудын нэг.",
    rating: "10/10",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop",
    action: "launch-idol",
    extra: {
      "Агентлаг": "Starship Entertainment",
      "Дебют": "2021 он 12-р сарын 1",
      "Гишүүд": "Wonyoung, Yujin, Rei, Liz, Gaeul, Leeseo",
      "Хит дуунууд": "ELEVEN, LOVE DIVE, After LIKE, Baddie"
    }
  }
];

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Custom interaction states (for the search/profile popups)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isIdolModalOpen, setIsIdolModalOpen] = useState(false);
  const [isAnimeGuesserOpen, setIsAnimeGuesserOpen] = useState(false);
  const [isTyperacerOpen, setIsTyperacerOpen] = useState(false);
  const [isBoatRacingOpen, setIsBoatRacingOpen] = useState(false);
  const [isSwimmingRaceOpen, setIsSwimmingRaceOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Dynamic Google Search States
  const [dynamicResults, setDynamicResults] = useState<SearchItem[]>([]);
  const [dynamicKnowledgePanel, setDynamicKnowledgePanel] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const executeSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setSearchSubmitted(true);
    setIsSearching(true);
    setDynamicResults([]);
    setDynamicKnowledgePanel(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (response.ok) {
        const data = await response.json();
        setDynamicResults(data.results || []);
        setDynamicKnowledgePanel(data.knowledgePanel || null);
      } else {
        throw new Error("Failed to fetch results");
      }
    } catch (err) {
      console.error("Search failed, falling back to local filtration:", err);
      // Fallback to local filtering of SEARCHABLE_DATA
      const filtered = SEARCHABLE_DATA.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.snippet.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );
      setDynamicResults(filtered);
      if (filtered.length > 0) {
        setDynamicKnowledgePanel({
          title: filtered[0].title,
          subtitle: filtered[0].category,
          description: filtered[0].snippet,
          image: filtered[0].image,
          extra: filtered[0].extra,
          action: filtered[0].action
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchSubmitted(false);
    setDynamicResults([]);
    setDynamicKnowledgePanel(null);
    setIsSearching(false);
  };

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

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "mn-MN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => {
          setIsListening(true);
        };
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setIsListening(false);
          executeSearch(text);
        };
        recognition.onerror = () => {
          setIsListening(false);
        };
        recognition.onend = () => {
          setIsListening(false);
        };
        recognition.start();
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    } else {
      setIsListening(true);
      setTimeout(() => {
        const phrases = ["Harry Potter", "Roblox", "Typeracer", "Сайханбилэг"];
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        setIsListening(false);
        executeSearch(randomPhrase);
      }, 2000);
    }
  };

  const handleResultClick = (action: string) => {
    closeSearch();

    if (action === "play-volleyball") {
      const idx = MOVIE_SLIDES.findIndex(slide => slide.id === "volleyball-passion");
      if (idx !== -1) setActiveIndex(idx);
      triggerToast("Волейболын танилцуулга ачааллаа! 🏐");
    } else if (action === "play-roblox") {
      setIsBoatRacingOpen(true);
      triggerToast("Завины уралдааныг шууд нээлээ! ⛵");
    } else if (action === "play-standoff") {
      const idx = MOVIE_SLIDES.findIndex(slide => slide.id === "standoff");
      if (idx !== -1) setActiveIndex(idx);
      triggerToast("Standoff 2 танилцуулга ачааллаа! 🔫");
    } else if (action === "launch-anime") {
      setIsAnimeGuesserOpen(true);
      triggerToast("Anime Guesser ачааллаа! 🎮");
    } else if (action === "launch-typeracer") {
      setIsTyperacerOpen(true);
      triggerToast("Typeracer ачааллаа! ⌨️");
    } else if (action === "launch-idol") {
      setIsIdolModalOpen(true);
    } else if (action === "open-profile") {
      setIsProfileOpen(true);
      triggerToast("Сайханбилэгийн тухай дэлгэрэнгүй мэдээллийг нээлээ! ⚡");
    }
  };



  const handleLearnMore = () => {
    setIsProfileOpen(true);
    triggerToast("Сайханбилэгийн тухай дэлгэрэнгүй мэдээллийг нээлээ! ⚡");
  };

  const handleMovieSelect = (id: string, title: string) => {
    const idx = MOVIE_SLIDES.findIndex(slide => slide.id === id);
    if (idx !== -1) {
      setActiveIndex(idx);
      const container = document.querySelector(".overflow-y-auto");
      if (container) {
        container.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <div className="relative h-screen w-full bg-black text-white font-sans overflow-x-hidden overflow-y-auto scroll-smooth flex flex-col hero-bg-gradient">
      
      {/* 1. BACKGROUND VIDEO (z-0) */}
      <video
        key="hero-bg-video"
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-85"
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

      {/* Hero fold container to prevent content sections from bleeding in at the bottom */}
      <div className="relative h-screen flex flex-col shrink-0 z-10">
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
          onAnimeClick={() => {
            setIsAnimeGuesserOpen(true);
            setIsMenuOpen(false);
          }}
          onTyperacerClick={() => {
            setIsTyperacerOpen(true);
            setIsMenuOpen(false);
          }}
          onBoatClick={() => {
            setIsBoatRacingOpen(true);
            setIsMenuOpen(false);
          }}
          onSwimmingClick={() => {
            setIsSwimmingRaceOpen(true);
            setIsMenuOpen(false);
          }}
          onLeaderboardClick={() => {
            setIsLeaderboardOpen(true);
            setIsMenuOpen(false);
          }}
          onNavLinkClick={(label) => {
            setIsMenuOpen(false);
            const elementId = label === "Editor's Pick" ? "editors-pick" :
                              label === "User Reviews" ? "user-reviews" : "";
            if (elementId) {
              const el = document.getElementById(elementId);
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
                triggerToast(`"${label}" хэсэг рүү шилжлээ! 🚀`);
              } else {
                triggerToast(`"${label}" хэсэг олдсонгүй!`);
              }
            }
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
          onAnimeClick={() => {
            setIsAnimeGuesserOpen(true);
            setIsMenuOpen(false);
          }}
          onTyperacerClick={() => {
            setIsTyperacerOpen(true);
            setIsMenuOpen(false);
          }}
          onBoatClick={() => {
            setIsBoatRacingOpen(true);
            setIsMenuOpen(false);
          }}
          onSwimmingClick={() => {
            setIsSwimmingRaceOpen(true);
            setIsMenuOpen(false);
          }}
          onLeaderboardClick={() => {
            setIsLeaderboardOpen(true);
            setIsMenuOpen(false);
          }}
          onNavLinkClick={(label) => {
            setIsMenuOpen(false);
            const elementId = label === "Editor's Pick" ? "editors-pick" :
                              label === "User Reviews" ? "user-reviews" : "";
            if (elementId) {
              const el = document.getElementById(elementId);
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
                triggerToast(`"${label}" хэсэг рүү шилжлээ! 🚀`);
              } else {
                triggerToast(`"${label}" хэсэг олдсонгүй!`);
              }
            }
          }}
        />

        {/* 6. PRIMARY HERO CONTENT (z-10) */}
        <HeroContent
          activeSlide={activeSlide}
          onPrev={handlePrev}
          onNext={handleNext}
          onLearnMore={handleLearnMore}
        />
      </div>

      {/* 7. DETAILED NAV SECTIONS (Editor's Pick, User Reviews) */}
      <ContentSections 
        onMovieClick={handleMovieSelect} 
        triggerToast={triggerToast} 
      />

      {/* =========================================================================
          INTERACTIVE ELEMENTS (Modals and Toasts) 
          All styled with .liquid-glass to maintain premium unified aesthetics 
          ========================================================================= */}

      {/* A. Search Modal (Google-style redesign) */}
      {isSearchOpen && (
        <div 
          id="search-modal-backdrop" 
          onClick={closeSearch}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
        >
          <div 
            id="search-modal-container"
            onClick={(e) => e.stopPropagation()}
            className={`w-full ${searchSubmitted ? "max-w-4xl" : "max-w-xl"} max-h-[85vh] overflow-y-auto scrollbar-thin p-6 md:p-8 rounded-2xl bg-zinc-950/95 text-white shadow-2xl relative border border-white/10 transition-all duration-300 ease-out animate-blur-fade-up cursor-default flex flex-col`}
            style={{ animationDelay: "0ms" }}
          >
            {/* Listening overlay inside Search Modal */}
            {isListening && (
              <div className="absolute inset-0 z-20 bg-black/95 rounded-2xl flex flex-col items-center justify-center p-6 animate-fade-in">
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute w-24 h-24 bg-blue-500/10 rounded-full animate-ping" />
                  <div className="absolute w-16 h-16 bg-red-500/20 rounded-full animate-ping" style={{ animationDelay: "500ms" }} />
                  <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-red-500 rounded-full flex items-center justify-center text-white relative z-10 shadow-lg">
                    <Mic size={24} className="animate-pulse" />
                  </div>
                </div>
                <h4 className="text-lg font-medium text-white mb-2">Сонсож байна...</h4>
                <p className="text-xs text-zinc-400 font-mono mb-6">"Волейбол" эсвэл "Роблокс" гэж хэлнэ үү</p>
                <button
                  onClick={() => setIsListening(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white transition-all cursor-pointer"
                >
                  Цуцлах
                </button>
              </div>
            )}

            {/* Close Button */}
            <button 
              id="btn-close-search"
              onClick={closeSearch}
              className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer z-10"
            >
              <X size={16} />
            </button>

            {/* GOOGLE HOME PAGE STATE */}
            {!searchSubmitted ? (
              <div className="flex-1 flex flex-col justify-center py-6">
                {/* Google-style Colorful Logo */}
                <div className="text-center mb-6 select-none animate-fade-in">
                  <div className="text-5xl md:text-6xl font-black tracking-tighter inline-flex items-center">
                    <span className="text-blue-500">C</span>
                    <span className="text-red-500">i</span>
                    <span className="text-yellow-500">n</span>
                    <span className="text-blue-400">e</span>
                    <span className="text-green-500">m</span>
                    <span className="text-red-500">a</span>
                    <span className="text-blue-500">t</span>
                    <span className="text-green-400">i</span>
                    <span className="text-red-500">c</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-mono mt-1">
                    Сайханбилэг Хайлтын Систем
                  </div>
                </div>

                {/* Google Search Bar Pill */}
                <div className="relative w-full max-w-lg mx-auto mb-6">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Search size={18} />
                  </div>
                  <input
                    id="input-search-query"
                    type="text"
                    placeholder="Хайх зүйл эсвэл вэб хаяг шивэх..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 hover:bg-zinc-900/80 rounded-full py-3.5 pl-11 pr-24 text-sm text-white placeholder-zinc-500 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-light"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim() !== "") {
                        executeSearch(searchQuery);
                      }
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2.5">
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    )}
                    {/* Google Colorful Mic Icon */}
                    <button 
                      onClick={startVoiceSearch}
                      title="Дуу хоолойгоор хайх"
                      className="text-zinc-400 hover:text-blue-400 transition-colors cursor-pointer flex items-center"
                    >
                      <Mic size={16} className="text-blue-500" />
                    </button>
                    {/* Google Lens Camera Icon */}
                    <button 
                      onClick={() => triggerToast("Google Lens систем бэлтгэгдэж байна! 📸")}
                      title="Зургаар хайх"
                      className="text-zinc-400 hover:text-red-400 transition-colors cursor-pointer flex items-center"
                    >
                      <Camera size={16} className="text-green-500" />
                    </button>
                  </div>
                </div>

                {/* Real-time Autocomplete Suggestions Panel */}
                {searchQuery.trim() !== "" && (
                  <div className="w-full max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl mb-6 divide-y divide-zinc-800/50 animate-fade-in">
                    {SEARCHABLE_DATA.filter(item => 
                      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      item.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.category.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          executeSearch(item.title);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-800/50 flex items-center gap-3 transition-colors text-xs text-zinc-300"
                      >
                        <Search size={14} className="text-zinc-500 shrink-0" />
                        <span className="font-medium text-white truncate">{item.title}</span>
                        <span className="ml-auto text-[10px] text-zinc-500 font-mono bg-zinc-800/40 px-1.5 py-0.5 rounded uppercase">{item.category}</span>
                      </button>
                    ))}
                    {SEARCHABLE_DATA.filter(item => 
                      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      item.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.category.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-3 text-xs text-zinc-500 text-center italic">
                        Үр дүн олдсонгүй. Хайх товчийг дарж интернетээс хайна уу.
                      </div>
                    )}
                  </div>
                )}

                {/* Classic Google Action Buttons */}
                <div className="flex justify-center gap-3 mb-6 animate-fade-in">
                  <button
                    onClick={() => {
                      if (searchQuery.trim() !== "") {
                        executeSearch(searchQuery);
                      } else {
                        triggerToast("Хайх үгээ оруулна уу! 🔍");
                      }
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white px-5 py-2.5 rounded-md border border-zinc-800/80 transition-all font-medium cursor-pointer"
                  >
                    Google Хайлт
                  </button>
                  <button
                    onClick={() => {
                      // Feeling lucky: select random item
                      const randomIdx = Math.floor(Math.random() * SEARCHABLE_DATA.length);
                      const luckyItem = SEARCHABLE_DATA[randomIdx];
                      triggerToast(`Lucky: "${luckyItem.title}" ачаалж байна! ✨`);
                      handleResultClick(luckyItem.action);
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white px-5 py-2.5 rounded-md border border-zinc-800/80 transition-all font-medium cursor-pointer"
                  >
                    Би азтай байна
                  </button>
                </div>

                {/* Offered languages label */}
                <div className="text-center text-xs text-zinc-500 font-light select-none">
                  Google-ийг ашиглах хэл:{" "}
                  <span className="text-blue-400 hover:underline cursor-pointer">Монгол</span>{" "}
                  <span className="text-blue-400 hover:underline cursor-pointer ml-1.5">English</span>
                </div>
              </div>
            ) : (
              // GOOGLE SEARCH RESULTS STATE
              <div className="flex-1 flex flex-col h-full animate-fade-in">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-zinc-800">
                  {/* Colorful mini logo */}
                  <div 
                    onClick={() => {
                      setSearchSubmitted(false);
                      setSearchQuery("");
                      setDynamicResults([]);
                      setDynamicKnowledgePanel(null);
                    }}
                    className="cursor-pointer select-none font-black tracking-tighter text-2xl flex items-center gap-1.5 shrink-0"
                  >
                    <span className="text-blue-500">C</span>
                    <span className="text-red-500">i</span>
                    <span className="text-yellow-500">n</span>
                    <span className="text-blue-400">e</span>
                    <span className="text-green-500">m</span>
                    <span className="text-red-500">a</span>
                  </div>

                  {/* Top search input bar */}
                  <div className="relative flex-1 max-w-xl">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2.5 pl-4 pr-16 text-xs text-white focus:outline-none focus:border-zinc-700 transition-all font-light"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && searchQuery.trim() !== "") {
                          executeSearch(searchQuery);
                        }
                      }}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 text-zinc-500">
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="hover:text-white transition-colors cursor-pointer">
                          <X size={14} />
                        </button>
                      )}
                      <button onClick={startVoiceSearch} className="text-blue-500 hover:text-blue-400 cursor-pointer">
                        <Mic size={14} />
                      </button>
                      <button onClick={() => executeSearch(searchQuery)} className="text-zinc-400 hover:text-white cursor-pointer">
                        <Search size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-navigation categories tab */}
                <div className="flex items-center gap-6 text-[11px] text-zinc-400 border-b border-zinc-800/60 py-2.5 overflow-x-auto no-scrollbar shrink-0 select-none">
                  <button className="text-blue-400 font-semibold border-b-2 border-blue-400 pb-2.5 flex items-center gap-1 shrink-0">
                    <Search size={12} /> Бүгд
                  </button>
                  <button onClick={() => triggerToast("Зургийн хайлтын сан холбогдож байна...")} className="hover:text-white pb-2.5 flex items-center gap-1 shrink-0 transition-colors">
                    <Globe size={12} /> Зураг
                  </button>
                  <button onClick={() => triggerToast("Видео санг ачаалж байна...")} className="hover:text-white pb-2.5 flex items-center gap-1 shrink-0 transition-colors">
                    <Play size={12} /> Видео
                  </button>
                  <button onClick={() => triggerToast("Сүүлийн үеийн мэдээг ачаалж байна...")} className="hover:text-white pb-2.5 flex items-center gap-1 shrink-0 transition-colors">
                    <TrendingUp size={12} /> Мэдээ
                  </button>
                  <button onClick={() => triggerToast("Мэдээлэл олдсонгүй")} className="hover:text-white pb-2.5 flex items-center gap-1 shrink-0 transition-colors">
                    <ExternalLink size={12} /> Дэлгэрэнгүй
                  </button>
                </div>

                {/* About results count */}
                <div className="text-[10px] text-zinc-500 py-3 font-mono">
                  {isSearching ? (
                    <span>Google хиймэл оюун ухаан хайж байна...</span>
                  ) : (
                    <span>Ойролцоогоор {dynamicResults.length} үр дүн олдлоо (0.15 секунд)</span>
                  )}
                </div>

                {/* Dual-column content (Results + Knowledge Panel) */}
                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 mt-2">
                  
                  {/* LEFT COLUMN: Classic Google Blue Results List */}
                  {isSearching ? (
                    <div className="flex-1 space-y-6 overflow-y-auto pr-1 py-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse space-y-2">
                          <div className="h-3 bg-zinc-800 rounded w-1/4" />
                          <div className="h-5 bg-zinc-800 rounded w-2/3" />
                          <div className="h-4 bg-zinc-800 rounded w-full" />
                          <div className="h-4 bg-zinc-800 rounded w-5/6" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 space-y-6 overflow-y-auto pr-1">
                      {dynamicResults.map((item) => (
                        <div key={item.id} className="group animate-blur-fade-up">
                          {/* URL/Favicon breadcrumb */}
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1 select-none">
                            <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 shrink-0">
                              <Globe size={10} className="text-zinc-500" />
                            </div>
                            <span className="truncate max-w-[200px] md:max-w-xs">{item.url}</span>
                          </div>
                          {/* Blue clickable Title */}
                          <button
                            onClick={() => {
                              if (item.action && item.action !== "external") {
                                handleResultClick(item.action);
                              } else {
                                window.open(item.url, "_blank");
                              }
                            }}
                            className="text-left text-blue-400 group-hover:underline text-base md:text-lg font-semibold block transition-colors leading-tight"
                          >
                            {item.title}
                          </button>
                          {/* Snippet Description */}
                          <p className="text-xs text-zinc-300 font-light mt-1.5 leading-relaxed">
                            {item.snippet}
                          </p>
                          {/* Rating if available */}
                          {item.rating && (
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-2">
                              <span className="text-yellow-500 font-medium">★ {item.rating}</span>
                              <span>• Үнэлгээ</span>
                              <span>• Cinematic сонголт</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* NO RESULTS FOUND STATE */}
                      {dynamicResults.length === 0 && (
                        <div className="text-zinc-400 py-8 space-y-4">
                          <p className="text-sm">
                            Таны хайсан <strong className="text-zinc-200">"{searchQuery}"</strong> үгтэй тохирох хайлтын үр дүн олдсонгүй.
                          </p>
                          <div className="text-xs space-y-1.5 text-zinc-500">
                            <p className="font-semibold text-zinc-400">Зөвлөмж:</p>
                            <ul className="list-disc list-inside pl-1 space-y-1">
                              <li>Бүх үгийн зөв бичсэн эсэхийг шалгана уу.</li>
                              <li>Өөр түлхүүр үг ашиглан хайна уу.</li>
                              <li>Илүү ерөнхий түлхүүр үг сонгоно уу.</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RIGHT COLUMN: Google Knowledge Graph Panel */}
                  {isSearching ? (
                    <div className="w-full lg:w-80 shrink-0 border border-zinc-800 rounded-xl bg-zinc-950 p-4 space-y-4 animate-pulse">
                      <div className="w-full h-32 bg-zinc-900 rounded-lg" />
                      <div className="h-4 bg-zinc-900 rounded w-1/2" />
                      <div className="h-3 bg-zinc-900 rounded w-1/3" />
                      <div className="space-y-2">
                        <div className="h-3 bg-zinc-900 rounded w-full" />
                        <div className="h-3 bg-zinc-900 rounded w-5/6" />
                      </div>
                    </div>
                  ) : dynamicKnowledgePanel ? (
                    <div className="w-full lg:w-80 shrink-0 border border-zinc-800 rounded-xl bg-zinc-950 p-4 space-y-4 select-none lg:sticky lg:top-0 h-fit max-h-[60vh] overflow-y-auto scrollbar-thin">
                      {/* Panel Image */}
                      {dynamicKnowledgePanel.image && (
                        <div className="w-full h-28 md:h-32 rounded-lg overflow-hidden relative border border-white/5">
                          <img 
                            src={dynamicKnowledgePanel.image} 
                            alt={dynamicKnowledgePanel.title}
                            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-widest text-yellow-400 border border-yellow-400/20">
                            {dynamicKnowledgePanel.subtitle || "Мэдээлэл"}
                          </div>
                        </div>
                      )}

                      {/* Panel titles */}
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">
                          {dynamicKnowledgePanel.title ? dynamicKnowledgePanel.title.split("(")[0] : ""}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono">Google Knowledge Graph</p>
                      </div>

                      {/* Snippet short summary */}
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        {dynamicKnowledgePanel.description}
                      </p>

                      <hr className="border-zinc-800" />

                      {/* Extra custom properties */}
                      {dynamicKnowledgePanel.extra && (
                        <div className="space-y-2 text-[11px]">
                          {Object.entries(dynamicKnowledgePanel.extra).map(([k, v]) => (
                            <div key={k} className="flex flex-col">
                              <span className="text-zinc-500 font-medium">{k}:</span>
                              <span className="text-zinc-200 mt-0.5 font-light">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Launch Button if there is a local action */}
                      {dynamicKnowledgePanel.action && dynamicKnowledgePanel.action !== "external" && (
                        <button
                          onClick={() => handleResultClick(dynamicKnowledgePanel.action)}
                          className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Play size={12} fill="white" /> Шууд ажиллуулах
                        </button>
                      )}
                    </div>
                  ) : null}

                </div>

                {/* Back button at results footer to return home */}
                <div className="pt-4 border-t border-zinc-800 mt-4 flex justify-between items-center text-[10px] text-zinc-500 shrink-0">
                  <span>Google.mn • Хайлтын тохиргоо</span>
                  <button
                    onClick={() => {
                      setSearchSubmitted(false);
                      setSearchQuery("");
                      setDynamicResults([]);
                      setDynamicKnowledgePanel(null);
                    }}
                    className="text-blue-500 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft size={10} /> Эхлэл рүү буцах
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* B. Profile Modal */}
      {isProfileOpen && (
        <div 
          id="profile-modal-backdrop" 
          onClick={() => setIsProfileOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md cursor-pointer"
        >
          <div 
            id="profile-modal-container"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm p-6 rounded-2xl liquid-glass text-white shadow-2xl relative border border-white/10 animate-blur-fade-up cursor-default"
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
                  <span className="text-white font-medium">Roblox, Standoff 🎮</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-gray-400 text-xs uppercase font-medium">Хобби:</span>
                  <span className="text-white font-medium">Волейбол 🏐</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-gray-400 text-xs uppercase font-medium">Дуртай кино:</span>
                  <span className="text-white font-medium">Хэрри Поттер ⚡</span>
                </div>
                <div className="flex flex-col gap-2 pb-2 border-b border-white/5">
                  <span className="text-gray-400 text-xs uppercase font-medium">Дуртай дуу, хамтлаг:</span>
                  <div className="flex flex-col gap-1.5 pl-1">
                    <span className="text-white text-xs font-medium flex items-center gap-1.5">
                      <span>🎵</span>
                      <span>Metronome — izna</span>
                    </span>
                    <span className="text-white text-xs font-medium flex items-center gap-1.5">
                      <span>🎵</span>
                      <span>Lovesick Girls — BLACKPINK</span>
                    </span>
                    <span className="text-white text-xs font-medium flex items-center gap-1.5">
                      <span>🎵</span>
                      <span>Iconic — LE SSERAFIM</span>
                    </span>
                    <span className="text-white text-xs font-medium flex items-center gap-1.5">
                      <span>🎵</span>
                      <span>ILLIT, KATSEYE</span>
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs uppercase font-medium">Имэйл:</span>
                  <span className="text-white text-xs font-mono">ezkasaikhan@gmail.com</span>
                </div>
              </div>

              {/* Info Stats block has been removed */}
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

      {/* F. Anime Guesser Game Modal */}
      {isAnimeGuesserOpen && (
        <AnimeGuesser onClose={() => setIsAnimeGuesserOpen(false)} />
      )}

      {/* G. Typeracer Game Modal */}
      {isTyperacerOpen && (
        <Typeracer onClose={() => setIsTyperacerOpen(false)} />
      )}

      {/* H. Boat Racing Game Modal */}
      {isBoatRacingOpen && (
        <BoatRacing 
          onClose={() => setIsBoatRacingOpen(false)} 
          onCoinsEarned={(coins) => {
            triggerToast(`Завины уралдаанд оролцож ${coins} C-Coins цуглууллаа! ⛵`);
          }}
        />
      )}

      {/* I. Swimming Race Game Modal */}
      {isSwimmingRaceOpen && (
        <SwimmingRace 
          onClose={() => setIsSwimmingRaceOpen(false)} 
          onCoinsEarned={(coins) => {
            triggerToast(`Усан спортын тэмцээнд оролцож ${coins} C-Coins цуглууллаа! 🏊`);
          }}
        />
      )}

      {/* J. Leaderboard System Modal */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl relative text-white flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="text-yellow-400" size={24} />
                <h3 className="text-lg font-black uppercase tracking-wider text-yellow-400">
                  Тэргүүлэгчдийн Самбар (Leaderboards)
                </h3>
              </div>
              <button 
                onClick={() => setIsLeaderboardOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[70vh] no-scrollbar">
              <Leaderboard mode="boat" allowModeSwitching={true} />
            </div>
          </div>
        </div>
      )}

      {/* E. Messenger-style Me-AI Assistant Popup */}
      <MeAiPopup />

    </div>
  );
}
