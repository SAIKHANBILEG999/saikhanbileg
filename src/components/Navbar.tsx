import { Search, User, Menu, X } from "lucide-react";
import { NAV_LINKS } from "../types";

const profileAvatar = "/src/assets/images/flower_avatar_1782704451351.jpg";

interface NavbarProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  onSearchClick: () => void;
  onProfileClick: () => void;
  onIdolClick: () => void;
  onAnimeClick: () => void;
}

export default function Navbar({
  isMenuOpen,
  setIsMenuOpen,
  onSearchClick,
  onProfileClick,
  onIdolClick,
  onAnimeClick,
}: NavbarProps) {
  return (
    <nav className="relative z-50 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 md:py-6">
      {/* Brand Logo (Left) */}
      <a
        href="#"
        id="nav-logo"
        className="flex items-center gap-2 font-black tracking-widest text-white hover:opacity-80 transition-opacity text-xl md:text-2xl animate-blur-fade-up"
        style={{ animationDelay: "0ms" }}
      >
        <span className="bg-white text-black px-2 py-0.5 rounded mr-1 font-mono font-bold text-sm md:text-base">C</span>
        CINEMATIC
      </a>

      {/* Desktop Links (Center) */}
      <div id="nav-desktop-links" className="hidden lg:flex items-center gap-8">
        {NAV_LINKS.map((link, idx) => (
          <a
            key={link.label}
            id={`nav-link-${idx}`}
            href={link.href}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors animate-blur-fade-up"
            style={{ animationDelay: `${100 + idx * 50}ms` }}
          >
            {link.label}
          </a>
        ))}
        {/* "🤖 My Idol" Link */}
        <button
          id="nav-link-idol"
          onClick={onIdolClick}
          className="text-sm font-medium text-yellow-400 hover:text-yellow-300 transition-colors animate-blur-fade-up flex items-center gap-1.5 cursor-pointer"
          style={{ animationDelay: `${100 + NAV_LINKS.length * 50}ms` }}
        >
          <span>🤖 My Idol</span>
        </button>

        {/* "🎮 Anime Guesser" Link */}
        <button
          id="nav-link-anime"
          onClick={onAnimeClick}
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors animate-blur-fade-up flex items-center gap-1.5 cursor-pointer"
          style={{ animationDelay: `${100 + (NAV_LINKS.length + 1) * 50}ms` }}
        >
          <span>🎮 Anime Guesser</span>
        </button>
      </div>

      {/* Desktop/Tablet Controls & Mobile Toggle (Right) */}
      <div id="nav-controls" className="flex items-center gap-3">
        {/* Search - Visible on sm and up */}
        <button
          id="btn-search-desktop"
          onClick={onSearchClick}
          className="hidden sm:flex items-center gap-2 rounded-full px-4 md:px-6 py-2 text-sm text-white font-medium liquid-glass animate-blur-fade-up"
          style={{ animationDelay: "350ms" }}
        >
          <Search size={18} className="text-gray-300" />
          <span>Search</span>
        </button>

        {/* Profile Circle - Visible on sm and up */}
        <button
          id="btn-profile-desktop"
          onClick={onProfileClick}
          className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full overflow-hidden text-white liquid-glass border border-white/10 hover:border-yellow-400/40 transition-all animate-blur-fade-up"
          style={{ animationDelay: "400ms" }}
          aria-label="User profile"
        >
          <img 
            src={profileAvatar} 
            alt="Сайханбилэг" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </button>

        {/* Hamburger Menu Toggle - Visible below lg */}
        <button
          id="btn-mobile-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex lg:hidden items-center justify-center w-10 h-10 rounded-full text-white liquid-glass animate-blur-fade-up"
          style={{ animationDelay: "350ms" }}
          aria-label="Toggle navigation menu"
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            {/* Menu icon */}
            <span
              className={`absolute transition-all duration-500 ease-out transform ${
                isMenuOpen
                  ? "rotate-180 scale-50 opacity-0"
                  : "rotate-0 scale-100 opacity-100"
              }`}
            >
              <Menu size={20} />
            </span>
            {/* X icon */}
            <span
              className={`absolute transition-all duration-500 ease-out transform ${
                isMenuOpen
                  ? "rotate-0 scale-100 opacity-100"
                  : "-rotate-180 scale-50 opacity-0"
              }`}
            >
              <X size={20} />
            </span>
          </div>
        </button>
      </div>
    </nav>
  );
}
