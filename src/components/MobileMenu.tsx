import { Search, User } from "lucide-react";
import { NAV_LINKS } from "../types";

const profileAvatar = "/src/assets/images/flower_avatar_1782704451351.jpg";

interface MobileMenuProps {
  isOpen: boolean;
  onSearchClick: () => void;
  onProfileClick: () => void;
  onIdolClick: () => void;
  onAnimeClick: () => void;
  onTyperacerClick: () => void;
  onNavLinkClick?: (label: string) => void;
}

export default function MobileMenu({
  isOpen,
  onSearchClick,
  onProfileClick,
  onIdolClick,
  onAnimeClick,
  onTyperacerClick,
  onNavLinkClick,
}: MobileMenuProps) {
  return (
    <div
      id="mobile-navigation-dropdown"
      className={`absolute top-[72px] left-0 right-0 z-40 flex flex-col bg-black/95 sm:bg-black/90 backdrop-blur-xl border-t border-b border-white/10 shadow-2xl transition-all duration-500 ease-out ${
        isOpen
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "-translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex flex-col gap-1 p-4">
        {NAV_LINKS.map((link, idx) => (
          <button
            key={link.label}
            id={`mobile-nav-link-${idx}`}
            onClick={() => onNavLinkClick?.(link.label)}
            className={`text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 py-3 px-4 rounded-xl transition-all duration-300 text-left cursor-pointer transform ${
              isOpen
                ? "translate-x-0 opacity-100"
                : "translate-x-4 opacity-0"
            }`}
            style={{
              transitionDelay: `${idx * 50}ms`,
            }}
          >
            {link.label}
          </button>
        ))}
        {/* "🤖 My Idol" Link */}
        <button
          id="mobile-nav-link-idol"
          onClick={onIdolClick}
          className={`text-base font-medium text-yellow-400 hover:text-yellow-300 hover:bg-white/5 py-3 px-4 rounded-xl transition-all duration-300 text-left flex items-center gap-2 transform cursor-pointer ${
            isOpen
              ? "translate-x-0 opacity-100"
              : "translate-x-4 opacity-0"
          }`}
          style={{
            transitionDelay: `${NAV_LINKS.length * 50}ms`,
          }}
        >
          <span>🤖 My Idol</span>
        </button>

        {/* "🎮 Anime Guesser" Link */}
        <button
          id="mobile-nav-link-anime"
          onClick={onAnimeClick}
          className={`text-base font-medium text-cyan-400 hover:text-cyan-300 hover:bg-white/5 py-3 px-4 rounded-xl transition-all duration-300 text-left flex items-center gap-2 transform cursor-pointer ${
            isOpen
              ? "translate-x-0 opacity-100"
              : "translate-x-4 opacity-0"
          }`}
          style={{
            transitionDelay: `${(NAV_LINKS.length + 1) * 50}ms`,
          }}
        >
          <span>🎮 Anime Guesser</span>
        </button>

        {/* "⌨️ Typeracer" Link */}
        <button
          id="mobile-nav-link-typeracer"
          onClick={onTyperacerClick}
          className={`text-base font-medium text-purple-400 hover:text-purple-300 hover:bg-white/5 py-3 px-4 rounded-xl transition-all duration-300 text-left flex items-center gap-2 transform cursor-pointer bg-transparent border-none ${
            isOpen
              ? "translate-x-0 opacity-100"
              : "translate-x-4 opacity-0"
          }`}
          style={{
            transitionDelay: `${(NAV_LINKS.length + 2) * 50}ms`,
          }}
        >
          <span>⌨️ Typeracer</span>
        </button>
      </div>

      {/* Bordered Bottom Section for search/profile on mobile (below sm) */}
      <div className="block sm:hidden border-t border-white/10 p-4">
        <div className="flex flex-col gap-3">
          {/* Mobile Search Button */}
          <button
            id="btn-search-mobile"
            onClick={onSearchClick}
            className="flex items-center justify-center gap-2 rounded-full w-full py-3 text-sm text-white font-medium liquid-glass"
          >
            <Search size={18} className="text-gray-300" />
            <span>Search Catalog</span>
          </button>

          {/* Mobile Profile Button */}
          <button
            id="btn-profile-mobile"
            onClick={onProfileClick}
            className="flex items-center justify-center gap-2 rounded-full w-full py-2.5 text-sm text-white font-medium liquid-glass px-4"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20 shrink-0">
              <img 
                src={profileAvatar} 
                alt="Сайханбилэг" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span>User Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
