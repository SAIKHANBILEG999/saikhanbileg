import React, { useState, useEffect } from "react";
import { getLeaderboard, LeaderboardEntry } from "../lib/firebase";
import { Trophy, Award, Sparkles, RefreshCw, X } from "lucide-react";
import { motion } from "motion/react";

interface LeaderboardProps {
  mode: "anime" | "character";
  onClose?: () => void;
}

export default function Leaderboard({ mode, onClose }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const topScores = await getLeaderboard(mode);
      setEntries(topScores);
    } catch (err) {
      console.error("Error loading scores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [mode]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 w-full relative">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-white/50 hover:text-white transition-all cursor-pointer"
        >
          <X size={18} />
        </button>
      )}

      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-yellow-400" />
          <h3 className="font-bold text-sm sm:text-base text-white tracking-wide uppercase">
            ШИЛДЭГ ТОГЛОГЧИД (TOP 10)
          </h3>
        </div>
        <button
          onClick={fetchScores}
          disabled={loading}
          className="text-white/60 hover:text-white hover:scale-105 active:scale-95 transition-all p-1 cursor-pointer"
          title="Сэргээх"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-yellow-400" : ""} />
        </button>
      </div>

      <div className="text-center mb-3">
        <span className="px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-bold text-[10px] tracking-wider uppercase">
          {mode === "anime" ? "Аниме Таах" : "Баатрын Дүр Таах"} горим
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <RefreshCw size={24} className="animate-spin text-yellow-400" />
          <span className="text-xs text-gray-400">Оноог ачаалж байна...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center space-y-2 border border-white/5 rounded-xl bg-white/[0.02]">
          <Award size={32} className="mx-auto text-gray-600" />
          <p className="text-xs text-gray-400 font-light">Одоогоор оноо хадгалагдаагүй байна.</p>
          <p className="text-[10px] text-yellow-500/80">Эхний тоглогч болоорой!</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
          {entries.map((entry, index) => {
            const isTop3 = index < 3;
            const rankColors = [
              "bg-yellow-400/20 text-yellow-400 border-yellow-400/30", // Gold
              "bg-slate-300/20 text-slate-300 border-slate-300/30",   // Silver
              "bg-amber-600/20 text-amber-500 border-amber-600/30",   // Bronze
            ];
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={entry.id || index}
                className={`flex items-center justify-between py-2.5 px-3 rounded-xl border transition-all ${
                  isTop3 
                    ? "bg-white/[0.05] border-white/10" 
                    : "bg-transparent border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs border ${
                    isTop3 ? rankColors[index] : "bg-white/5 text-gray-400 border-white/5"
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-semibold text-xs sm:text-sm text-white max-w-[120px] sm:max-w-[180px] truncate">
                    {entry.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs sm:text-sm font-black text-yellow-400">
                    {entry.score}
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">pt</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
