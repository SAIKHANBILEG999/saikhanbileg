import { Star, Calendar, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { MovieSlide } from "../types";

interface HeroContentProps {
  activeSlide: MovieSlide;
  onPrev: () => void;
  onNext: () => void;
  onPlayNow: () => void;
  onLearnMore: () => void;
}

export default function HeroContent({
  activeSlide,
  onPrev,
  onNext,
  onPlayNow,
  onLearnMore,
}: HeroContentProps) {
  const { id, rating, releaseDate, title, description } = activeSlide;

  return (
    <div
      id="hero-content-wrapper"
      className="flex-1 flex flex-col justify-end px-4 sm:px-6 md:px-12 pb-8 md:pb-16 z-10"
    >
      <div className="flex flex-col md:flex-row items-end gap-8 md:gap-12 w-full">
        {/* Left Side: Metadata, Title, Description, and CTAs */}
        <div className="flex-1 w-full text-left">
          
          {/* Metadata Row */}
          <div
            key={`meta-${id}`}
            id="hero-metadata"
            className="flex flex-wrap items-center gap-3 sm:gap-6 mb-4 md:mb-6 text-xs sm:text-sm text-gray-300 animate-blur-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            {/* Rating */}
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Star
                className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-yellow-400"
              />
              <span>{rating}</span>
            </div>

            {/* Separator Dot */}
            <span className="w-1 h-1 rounded-full bg-white/35"></span>

            {/* Release Date */}
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <span>{releaseDate}</span>
            </div>
          </div>

          {/* Title */}
          <h1
            key={`title-${id}`}
            id="hero-title"
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white tracking-tight leading-[1.1] mb-4 md:mb-6 max-w-4xl animate-blur-fade-up"
            style={{ animationDelay: "400ms", letterSpacing: "-0.04em" }}
          >
            {title}
          </h1>

          {/* Description */}
          <p
            key={`desc-${id}`}
            id="hero-description"
            className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 md:mb-10 max-w-2xl font-light leading-relaxed animate-blur-fade-up"
            style={{ animationDelay: "500ms" }}
          >
            {description}
          </p>

          {/* CTA Buttons */}
          <div
            key={`cta-${id}`}
            id="hero-ctas"
            className="flex flex-wrap items-center gap-3 sm:gap-4 animate-blur-fade-up"
            style={{ animationDelay: "600ms" }}
          >
            {/* Play Now */}
            <button
              id="btn-play-now"
              onClick={onPlayNow}
              className="flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 active:scale-95 transition-all duration-300 rounded-full font-medium px-6 sm:px-8 py-2.5 sm:py-3.5 text-sm sm:text-base cursor-pointer shadow-lg shadow-white/5"
            >
              <Play size={18} className="fill-black text-black" />
              <span>Play Now</span>
            </button>

            {/* Learn More */}
            <button
              id="btn-learn-more"
              onClick={onLearnMore}
              className="flex items-center justify-center gap-2 rounded-full font-medium text-white liquid-glass active:scale-95 transition-all duration-300 px-6 sm:px-8 py-2.5 sm:py-3.5 text-sm sm:text-base cursor-pointer"
            >
              <span>Learn More</span>
            </button>
          </div>
        </div>

        {/* Right Side: Navigation controls */}
        <div
          key={`nav-arrows-${id}`}
          id="hero-navigation-controls"
          className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end animate-blur-fade-up mt-2 md:mt-0"
          style={{ animationDelay: "800ms" }}
        >
          {/* Previous Button */}
          <button
            id="btn-prev-slide"
            onClick={onPrev}
            className="flex items-center justify-center rounded-full liquid-glass w-12 h-12 md:w-14 md:h-14 text-white active:scale-90 transition-all cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>

          {/* Next Button */}
          <button
            id="btn-next-slide"
            onClick={onNext}
            className="flex items-center justify-center rounded-full liquid-glass w-12 h-12 md:w-14 md:h-14 text-white active:scale-90 transition-all cursor-pointer"
            aria-label="Next slide"
            style={{ animationDelay: "100ms" }} // subtle offset for the next arrow entry
          >
            <ChevronRight size={24} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
