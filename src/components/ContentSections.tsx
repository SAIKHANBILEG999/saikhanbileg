import React, { useState, useEffect } from "react";
import { Star, MessageSquare, Send, Award, Shield, Sparkles } from "lucide-react";
import { saveReview, getReviews, UserReview } from "../lib/firebase";

interface ContentSectionsProps {
  onMovieClick: (id: string, title: string) => void;
  triggerToast: (msg: string) => void;
}

// 1. Editor's Pick Mock Data (Focusing on Saikhanbileg's hobbies)
const EDITORS_PICK_LIST = [
  {
    id: "roblox",
    title: "Roblox: Infinite Worlds",
    type: "Тоглоом",
    description: "Сайханбилэгийн хамгийн дуртай тоглоом! Төгсгөлгүй олон сонирхолтой ертөнцөөр аялж, өөрийн хүссэн тоглоомыг бүтээн найзуудтайгаа хамт тоглох боломжтой бөгөөд өөрийн төсөөлөлд амьдардаг.",
    icon: "🎮",
    score: "9.8/10",
    comment: "Роблокс дээр өөрийн ертөнцийг бүтээж, найзуудтайгаа тоглох нь хамгийн гайхалтай!"
  },
  {
    id: "volleyball",
    title: "Волейбол: Багийн Тоглолт",
    type: "Спорт",
    description: "12 настай Сайханбилэгийн дуртай спорт болох волейболын хүч чадал, багийн тоглолт, ялалтын төлөөх тэмүүлэл.",
    icon: "🏐",
    score: "9.5/10",
    comment: "Волейбол тоглоход өндөр үсрэх, бөмбөгийг хүчтэй смэшлэх мэдрэмж хамгийн гоё байдаг!"
  }
];

export default function ContentSections({ onMovieClick, triggerToast }: ContentSectionsProps) {
  // Reviews state
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formMovie, setFormMovie] = useState("Roblox");
  const [formText, setFormText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Load reviews on mount
  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const data = await getReviews();
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formText.trim()) {
      triggerToast("Нэр болон сэтгэгдлийн хэсгийг бөглөнө үү! ✍️");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const newReviewData = {
        name: formName,
        rating: Number(formRating),
        movieTitle: formMovie,
        reviewText: formText
      };

      await saveReview(newReviewData);
      triggerToast("Сэтгэгдэл амжилттай үлдлээ! Баярлалаа! 🎉🌟");
      
      // Optimistic update
      setReviews(prev => [
        {
          ...newReviewData,
          createdAt: { seconds: Date.now() / 1000 }
        },
        ...prev
      ]);

      // Reset form
      setFormName("");
      setFormText("");
    } catch (err) {
      console.error(err);
      triggerToast("Сэтгэгдэл илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div id="additional-sections" className="relative z-20 w-full bg-zinc-950/90 backdrop-blur-md pt-16 pb-24 border-t border-white/5 space-y-24">
      
      {/* 1. EDITOR'S PICK SECTION */}
      <section id="editors-pick" className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 scroll-mt-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Award size={20} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Редакторын Сонголт</h2>
            <p className="text-xs text-zinc-400 font-light mt-0.5">Вэб хөгжүүлэгч Сайханбилэгийн хамгийн өндөр үнэлгээтэй дуртай зүйлс</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {EDITORS_PICK_LIST.map((item, idx) => (
            <div 
              key={item.id}
              className="relative p-6 rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-950/80 border border-white/5 hover:border-purple-500/20 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Highlight badge decor */}
              <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-purple-500 text-white text-[10px] font-bold tracking-wider px-3 py-1 rounded-full uppercase shadow-lg shadow-purple-500/20">
                #Pick {idx + 1}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-400 font-mono font-semibold uppercase tracking-wider">{item.type}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{item.title}</h3>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed font-light mb-4">
                  {item.description}
                </p>

                {/* Developer comment balloon */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 relative mb-4">
                  <div className="absolute left-4 top-0 transform -translate-y-1/2 w-2 h-2 rotate-45 bg-zinc-900 border-l border-t border-white/5" />
                  <p className="text-xs text-zinc-300 italic font-light leading-relaxed">
                    💬 "{item.comment}"
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-zinc-500">
                <span>Үнэлгээ:</span>
                <span className="text-purple-400 font-mono font-bold text-sm">{item.score}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. USER REVIEWS SECTION */}
      <section id="user-reviews" className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 scroll-mt-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Хэрэглэгчийн Сэтгэгдлүүд</h2>
            <p className="text-xs text-zinc-400 font-light mt-0.5">Зочлогчдын үлдээсэн сэтгэгдэл, үнэлгээнүүд болон сэтгэгдэл үлдээх хэсэг</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Review submission Form (Left/Top) */}
          <div className="lg:col-span-5 p-6 md:p-8 rounded-2xl bg-zinc-900/30 border border-white/5 h-fit">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-400" />
              <span>Сэтгэгдэл үлдээх</span>
            </h3>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider mb-1.5">Таны нэр:</label>
                <input 
                  type="text" 
                  placeholder="Сайханбилэг" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 focus:border-yellow-500/40 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500/20 transition-all font-light"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider mb-1.5">Аль сэдэвт үнэлгээ өгөх:</label>
                <select 
                  value={formMovie}
                  onChange={(e) => setFormMovie(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 focus:border-yellow-500/40 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none transition-all font-light"
                >
                  <option value="Roblox">Roblox Тоглоом</option>
                  <option value="Standoff 2">Standoff 2 Тоглоом</option>
                  <option value="Volleyball">Волейболын Спорт</option>
                  <option value="General App">Cinematic Вэбсайт</option>
                </select>
              </div>

              {/* Stars rating selection */}
              <div>
                <label className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider mb-1.5">Үнэлгээ:</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormRating(star)}
                      className="text-zinc-600 hover:text-yellow-400 transition-colors cursor-pointer"
                    >
                      <Star 
                        size={22} 
                        className={star <= formRating ? "text-yellow-400 fill-yellow-400" : "text-zinc-600"} 
                      />
                    </button>
                  ))}
                  <span className="text-xs text-zinc-400 ml-2 font-mono">{formRating} / 5</span>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-[11px] text-zinc-400 font-medium uppercase tracking-wider mb-1.5">Сэтгэгдэл:</label>
                <textarea 
                  rows={4}
                  placeholder="Энэхүү кино/спорт надад үнэхээр их таалагддаг..." 
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 focus:border-yellow-500/40 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-yellow-500/20 transition-all font-light resize-none leading-relaxed"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span>{isSubmittingReview ? "Илгээж байна..." : "Илгээх"}</span>
                <Send size={12} />
              </button>
            </form>
          </div>

          {/* Reviews list panel (Right/Bottom) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
              {isLoadingReviews ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-xs">
                  <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-3" />
                  <span>Сэтгэгдлүүдийг татаж байна...</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 text-xs italic">
                  Анхны сэтгэгдлийг та үлдээгээрэй! ✨✍️
                </div>
              ) : (
                reviews.map((review, idx) => (
                  <div 
                    key={review.id || idx}
                    className="p-4 rounded-xl bg-zinc-900/30 border border-white/5 flex gap-4 animate-blur-fade-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Fake avatar */}
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {review.name.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{review.name}</span>
                        <span className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded font-mono uppercase">{review.movieTitle}</span>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            size={10} 
                            className={i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-zinc-700"} 
                          />
                        ))}
                      </div>

                      <p className="text-xs text-zinc-300 font-light leading-relaxed pt-1">
                        {review.reviewText}
                      </p>

                      {/* Date */}
                      <div className="text-[9px] text-zinc-500 text-right pt-1 font-mono">
                        {review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleString() : "Саяхан"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer summary info */}
            <div className="p-4 rounded-xl bg-zinc-900/10 border border-white/5 text-[11px] text-zinc-400 flex items-center justify-between mt-4">
              <span className="flex items-center gap-1.5">
                <Shield size={12} className="text-green-500" />
                <span>Баталгаажсан сэтгэгдлийн сан</span>
              </span>
              <span className="text-zinc-500 font-mono">Firestore DB</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
