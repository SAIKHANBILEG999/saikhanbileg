import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gamepad2, Heart, Timer, Trophy, RotateCcw, Volume2, Sparkles, X, ChevronRight, Play, Users, Award } from "lucide-react";
import { saveScore } from "../lib/firebase";
import Leaderboard from "./Leaderboard";

interface Question {
  id: number;
  emojis: string;
  answer: string;
  answers: string[];
  options: string[];
  image: string;
  video: string;
  type?: "anime" | "character";
}

interface AnimeGuesserProps {
  onClose: () => void;
}

// Helper to convert standard YouTube watch links to embed links
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  try {
    let videoId = "";
    if (url.includes("youtube.com/embed/")) {
      videoId = url.split("youtube.com/embed/")[1]?.split(/[?#]/)[0];
    } else if (url.includes("youtube-nocookie.com/embed/")) {
      videoId = url.split("youtube-nocookie.com/embed/")[1]?.split(/[?#]/)[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split(/[?#]/)[0];
    } else if (url.includes("youtube.com/watch")) {
      const urlParams = new URLSearchParams(url.split("?")[1]);
      videoId = urlParams.get("v") || "";
    } else if (url.includes("youtube.com/v/")) {
      videoId = url.split("youtube.com/v/")[1]?.split(/[?#]/)[0];
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch (e) {
    console.error("Error parsing YouTube URL:", e);
  }
  return url;
}

// Browser-synthesized Web Audio effects so we don't depend on static files
const playSound = (type: "ding" | "buzz" | "bonus" | "hint") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === "ding") {
      // Pleasant dual-frequency high chime (C6 then G6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.08); // G6
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start();
      osc2.start(ctx.currentTime + 0.08);
      osc1.stop(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.48);
    } else if (type === "bonus") {
      // Special ascending triumph sound
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
        gain.gain.setValueAtTime(0.07, ctx.currentTime + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.1);
        osc.stop(ctx.currentTime + index * 0.1 + 0.25);
      });
    } else if (type === "hint") {
      // Shimmering magic sweep
      const freqs = [587.33, 659.25, 783.99, 880.00, 1046.50]; // D5, E5, G5, A5, C6
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.05);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + index * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.05 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.05);
        osc.stop(ctx.currentTime + index * 0.05 + 0.2);
      });
    } else {
      // Low dual saw buzzer (dissonant 110Hz and 115Hz for harsh buzzer)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(110, ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.35);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(115, ctx.currentTime);
      osc2.frequency.linearRampToValueAtTime(85, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    }
  } catch (error) {
    console.error("Web Audio API not supported or blocked by browser gesture:", error);
  }
};

export default function AnimeGuesser({ onClose }: AnimeGuesserProps) {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [consecutive, setConsecutive] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<"loading" | "intro" | "playing" | "answered" | "gameover" | "win">("loading");
  
  // Custom game mode and leaderboards states
  const [gameMode, setGameMode] = useState<"anime" | "character">("anime");
  const [playerName, setPlayerName] = useState("");
  const [savingScore, setSavingScore] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Input states
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shakeButton, setShakeButton] = useState<string | null>(null);
  const [showBonusAlert, setShowBonusAlert] = useState(false);

  // Hint states
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintUsedForCurrentQuestion, setHintUsedForCurrentQuestion] = useState(false);
  const [eliminatedChoices, setEliminatedChoices] = useState<string[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch questions from data.json
  useEffect(() => {
    fetch("/data.json")
      .then((res) => res.json())
      .then((data: Question[]) => {
        setAllQuestions(data);
        const filtered = data.filter((q) => (q.type || "anime") === "anime");
        setQuestions(filtered);
        setGameState("intro");
      })
      .catch((err) => {
        console.error("Error fetching anime questions:", err);
        // Fallback array if fetch fails to make the application bulletproof
        const fallback: Question[] = [
          {
            id: 1,
            emojis: "🏴‍☠️🍖👒",
            answer: "One Piece",
            answers: ["one piece", "onepiece", "ван пийс", "ванпийс"],
            options: ["One Piece", "Naruto", "Bleach", "Dragon Ball"],
            image: "https://dw9to29mmj727.cloudfront.net/promo/2016/5265-SeriesHeaders_OP_2000x800_wm.jpg",
            video: "",
            type: "anime"
          },
          {
            id: 2,
            emojis: "🦊🍜🌀",
            answer: "Naruto",
            answers: ["naruto", "наруто"],
            options: ["Naruto", "Dragon Ball", "One Piece", "My Hero Academia"],
            image: "https://upload.wikimedia.org/wikipedia/en/9/94/NarutoCoverTankobon1.jpg",
            video: "",
            type: "anime"
          }
        ];
        setAllQuestions(fallback);
        setQuestions(fallback);
        setGameState("intro");
      });
  }, []);


  // Generate 4 dynamic choices for the current question
  useEffect(() => {
    if (questions.length > 0 && questions[currentIndex]) {
      const q = questions[currentIndex];
      const correctAnswer = q.answer;
      
      if (q.options.length <= 4) {
        setCurrentChoices(q.options);
      } else {
        const incorrects = q.options.filter(
          (opt) => opt.toLowerCase() !== correctAnswer.toLowerCase()
        );
        const uniqueIncorrects = Array.from(new Set(incorrects));
        const shuffledIncorrects = [...uniqueIncorrects].sort(() => 0.5 - Math.random());
        const selectedIncorrects = shuffledIncorrects.slice(0, 3);
        const combined = [correctAnswer, ...selectedIncorrects];
        const shuffledCombined = combined.sort(() => 0.5 - Math.random());
        setCurrentChoices(shuffledCombined);
      }
    }
  }, [currentIndex, questions]);

  // Timer Effect
  useEffect(() => {
    if (gameState === "playing") {
      setTimeLeft(30);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentIndex]);

  const handleTimeOut = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playSound("buzz");
    setConsecutive(0);
    const nextLives = lives - 1;
    setLives(nextLives);
    setIsCorrect(false);
    setSelectedOption(null);
    setGameState(nextLives <= 0 ? "gameover" : "answered");
  };

  const checkAnswerString = (userInput: string, answerList: string[]): boolean => {
    const cleanInput = userInput.trim().toLowerCase().replace(/\s+/g, "");
    return answerList.some((ans) => {
      const cleanAns = ans.trim().toLowerCase().replace(/\s+/g, "");
      return cleanInput === cleanAns;
    });
  };

  const handleOptionSelect = (option: string) => {
    if (gameState !== "playing" || selectedOption !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOption(option);
    const currentQuestion = questions[currentIndex];
    
    // Check match either via standard exact answer string or user answers array list
    const isAnswerCorrect = option === currentQuestion.answer || checkAnswerString(option, currentQuestion.answers);

    processAnswerOutcome(isAnswerCorrect, option);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameState !== "playing" || !textInput.trim() || selectedOption !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const input = textInput.trim();
    const currentQuestion = questions[currentIndex];
    const isAnswerCorrect = checkAnswerString(input, currentQuestion.answers) || input.toLowerCase() === currentQuestion.answer.toLowerCase();

    setSelectedOption(input);
    processAnswerOutcome(isAnswerCorrect, input);
  };

  const processAnswerOutcome = (isAnswerCorrect: boolean, selectedStr: string) => {
    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      playSound("ding");
      setScore((prev) => prev + 10);
      const nextConsecutive = consecutive + 1;
      setConsecutive(nextConsecutive);

      // 3 correct in a row bonus (+30 points)
      if (nextConsecutive > 0 && nextConsecutive % 3 === 0) {
        setScore((prev) => prev + 30);
        setShowBonusAlert(true);
        setTimeout(() => playSound("bonus"), 150);
        setTimeout(() => setShowBonusAlert(false), 3000);
      }
      
      // Delay to enjoy the green correct visual state
      setTimeout(() => {
        setGameState("answered");
      }, 1200);
    } else {
      playSound("buzz");
      setShakeButton(selectedStr);
      setConsecutive(0);
      const nextLives = lives - 1;
      setLives(nextLives);
      setTimeout(() => setShakeButton(null), 500);
      
      // Delay to see the red wrong visual state + shake
      setTimeout(() => {
        setGameState(nextLives <= 0 ? "gameover" : "answered");
      }, 1200);
    }
  };

  const handleNextQuestion = () => {
    setTextInput("");
    setSelectedOption(null);
    setIsCorrect(false);
    setHintUsedForCurrentQuestion(false);
    setEliminatedChoices([]);

    if (currentIndex + 1 >= questions.length) {
      setGameState("win");
    } else {
      setCurrentIndex((prev) => prev + 1);
      setGameState("playing");
    }
  };

  const startGame = (selectedMode: "anime" | "character") => {
    setGameMode(selectedMode);
    const filtered = allQuestions.filter((q) => (q.type || "anime") === selectedMode);
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setLives(3);
    setConsecutive(0);
    setTextInput("");
    setSelectedOption(null);
    setIsCorrect(false);
    setScoreSaved(false);
    setPlayerName("");
    setHintsLeft(3);
    setHintUsedForCurrentQuestion(false);
    setEliminatedChoices([]);
    setGameState("playing");
  };

  const restartGame = () => {
    const filtered = allQuestions.filter((q) => (q.type || "anime") === gameMode);
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setLives(3);
    setConsecutive(0);
    setTextInput("");
    setSelectedOption(null);
    setIsCorrect(false);
    setScoreSaved(false);
    setHintsLeft(3);
    setHintUsedForCurrentQuestion(false);
    setEliminatedChoices([]);
    setGameState("playing");
  };

  const handleUseHint = () => {
    if (gameState !== "playing" || hintUsedForCurrentQuestion || hintsLeft <= 0 || !questions[currentIndex]) return;

    const currentQuestion = questions[currentIndex];
    const correctAnswer = currentQuestion.answer;

    // Play hint sound
    playSound("hint");

    // Deduct 1 hint from total
    setHintsLeft((prev) => prev - 1);
    setHintUsedForCurrentQuestion(true);

    // Filter out incorrect choices from current choices, then shuffle and choose 2 of them to eliminate
    const incorrectChoices = currentChoices.filter(
      (choice) => choice.toLowerCase() !== correctAnswer.toLowerCase() && choice !== ""
    );

    const shuffledIncorrect = [...incorrectChoices].sort(() => 0.5 - Math.random());
    const toEliminate = shuffledIncorrect.slice(0, 2);

    setEliminatedChoices(toEliminate);
  };

  const handleSaveScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    setSavingScore(true);
    try {
      await saveScore(playerName.trim(), score, gameMode);
      setScoreSaved(true);
    } catch (err) {
      console.error("Error saving score:", err);
    } finally {
      setSavingScore(false);
    }
  };

  const renderScoreSubmission = () => {
    if (scoreSaved) {
      return (
        <div className="w-full max-w-sm mt-3 animate-fade-in">
          <Leaderboard mode={gameMode} />
        </div>
      );
    }

    return (
      <form onSubmit={handleSaveScoreSubmit} className="w-full max-w-xs space-y-2 bg-white/5 border border-white/10 rounded-2xl p-4 mt-2">
        <span className="text-[10px] uppercase text-gray-400 tracking-wider block font-bold text-center">Оноогоо самбарт хадгалах</span>
        <div className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Таны нэр..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={savingScore}
            className="flex-1 bg-white/5 border border-white/15 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-all text-center"
          />
          <button
            type="submit"
            disabled={savingScore || !playerName.trim()}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
          >
            {savingScore ? "Бүртгэж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    );
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in cursor-pointer" onClick={onClose}>
      {/* Styles for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-6px); }
          30%, 60%, 90% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] h-auto p-4 sm:p-6 rounded-2xl liquid-glass text-white shadow-2xl relative border border-white/10 flex flex-col justify-start gap-4 sm:gap-5 animate-blur-fade-up cursor-default overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* LOADING STATE */}
        {gameState === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Gamepad2 size={48} className="text-yellow-400 animate-spin" />
            <p className="text-gray-300 font-light text-sm">Таавруудыг бэлдэж байна...</p>
          </div>
        )}

        {/* INTRO / START SCREEN */}
        {gameState === "intro" && (
          <div className="flex-1 flex flex-col items-center justify-start text-center px-2 py-4 space-y-5">
            <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl flex items-center justify-center border border-yellow-400/20 shadow-lg shadow-yellow-500/5">
              <Gamepad2 size={36} className="text-yellow-400" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-wider text-white">ANIME GUESSER CHALLENGE</h2>
              <p className="text-yellow-400 text-[10px] tracking-widest uppercase font-mono">Сайханбилэгийн тусгай тоглоом</p>
            </div>

            {showLeaderboard ? (
              <div className="w-full space-y-4">
                <Leaderboard mode={gameMode} onClose={() => setShowLeaderboard(false)} />
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Буцах
                </button>
              </div>
            ) : (
              <>
                {/* Game Mode Selection */}
                <div className="w-full max-w-md space-y-3">
                  <h3 className="text-[10px] uppercase text-gray-400 tracking-wider font-bold">ТОГЛООМЫН ГОРИМ СОНГОХ</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setGameMode("anime")}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        gameMode === "anime"
                          ? "bg-yellow-500/10 border-yellow-400 shadow-md shadow-yellow-500/5"
                          : "bg-white/5 border-white/10 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={16} className={gameMode === "anime" ? "text-yellow-400" : "text-gray-400"} />
                        <span className="font-bold text-sm text-white font-sans">Аниме Таах</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                        Emoji-оор илэрхийлсэн аниме нэрийг таана.
                      </p>
                    </button>

                    <button
                      onClick={() => setGameMode("character")}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        gameMode === "character"
                          ? "bg-yellow-500/10 border-yellow-400 shadow-md shadow-yellow-500/5"
                          : "bg-white/5 border-white/10 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={16} className={gameMode === "character" ? "text-yellow-400" : "text-gray-400"} />
                        <span className="font-bold text-sm text-white font-sans">Баатрын Дүр Таах</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                        Баатрын зургийг хараад нэрийг нь таана.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="max-w-md bg-white/5 p-4 rounded-xl border border-white/5 text-left text-xs text-gray-300 space-y-2.5 w-full">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-yellow-400 shrink-0" />
                    <span>Асуулт бүр 4 сонголттой, зөв хариулбал <strong className="text-white">+10 оноо</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer size={14} className="text-yellow-400 shrink-0" />
                    <span>Асуулт бүрт <strong className="text-white">30 секунд</strong> байна</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart size={14} className="text-yellow-400 shrink-0" />
                    <span>Тоглогч <strong className="text-white">3 амьтай</strong>, буруу хариулбал амь хасагдана</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-yellow-400 shrink-0" />
                    <span>Дараалан 3 зөв хариулбал <strong className="text-yellow-400">Bonus +30 оноо</strong></span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                  <button
                    onClick={() => startGame(gameMode)}
                    className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-black font-bold rounded-xl shadow-lg hover:shadow-yellow-500/10 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                  >
                    <Play size={16} className="fill-black" />
                    <span>ТОГЛООМЫГ ЭХЛЭХ</span>
                  </button>

                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="py-3 px-5 bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-sm border border-white/5"
                  >
                    <Trophy size={16} className="text-yellow-400" />
                    <span>Самбар харах</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ACTIVE GAME STATES (PLAYING & ANSWERED) */}
        {(gameState === "playing" || gameState === "answered") && currentQuestion && (
          <div className="flex-1 flex flex-col justify-start space-y-4">
            
            {/* HUD / Stats Bar */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  <Trophy size={14} className="text-yellow-400" />
                  <span className="font-mono text-xs sm:text-sm font-bold text-white">{score} pt</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(3)].map((_, i) => (
                    <Heart
                      key={i}
                      size={16}
                      className={`transition-all duration-300 ${
                        i < lives ? "text-red-500 fill-red-500 scale-100" : "text-gray-600 scale-90"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="text-center font-mono text-xs text-gray-400">
                Асуулт: <strong className="text-white text-sm">{currentIndex + 1}</strong> / {questions.length}
              </div>

              {/* Timer & Hint */}
              <div className="flex items-center gap-2">
                {gameState === "playing" && (
                  <button
                    onClick={handleUseHint}
                    disabled={hintUsedForCurrentQuestion || hintsLeft <= 0}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                      hintUsedForCurrentQuestion
                        ? "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed"
                        : hintsLeft <= 0
                        ? "bg-red-500/5 border-red-500/10 text-red-500/50 cursor-not-allowed"
                        : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/15 cursor-pointer active:scale-95"
                    }`}
                    title={hintUsedForCurrentQuestion ? "Энэ асуултад тусламж авсан" : `Тусламж авах (${hintsLeft} үлдсэн)`}
                  >
                    <Sparkles size={11} className={hintUsedForCurrentQuestion ? "text-gray-500" : "text-yellow-400 animate-pulse"} />
                    <span className="hidden sm:inline">Тусламж:</span>
                    <span>💡 {hintsLeft}</span>
                  </button>
                )}

                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  <Timer size={14} className={`${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-cyan-400"}`} />
                  <span className={`font-mono text-xs sm:text-sm font-bold ${timeLeft <= 10 ? "text-red-500" : "text-white"}`}>
                    {timeLeft}s
                  </span>
                </div>
              </div>
            </div>

            {/* BONUS ALERT */}
            <AnimatePresence>
              {showBonusAlert && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  className="bg-yellow-500 text-black px-4 py-2 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2 border border-yellow-400/30"
                >
                  <Sparkles size={16} className="animate-spin text-black" />
                  🔥 3 ДАРААЛАН ЗӨВ! +30 БОНУС ОНОО 🔥
                </motion.div>
              )}
            </AnimatePresence>

            {/* Smooth slide and fade transition for the entire question content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 25, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -25, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex-1 flex flex-col justify-start space-y-4"
              >

            {/* Clue Section */}
            {gameMode === "anime" ? (
              <div className={`text-center bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center space-y-1.5 transition-all ${
                gameState === "answered" ? "py-3" : "py-6 sm:py-8"
              }`}>
                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 to-transparent pointer-events-none" />
                <div className={`tracking-widest filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] select-none transition-all ${
                  gameState === "answered" ? "text-2xl sm:text-3xl" : "text-4xl sm:text-6xl"
                }`}>
                  {currentQuestion.emojis}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-400 font-light">Эдгээр emoji-оор ямар аниме-г илэрхийлж байна вэ?</p>
              </div>
            ) : (
              <div className={`relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] flex items-center justify-center p-2.5 transition-all ${
                gameState === "answered" ? "h-28 sm:h-36" : "h-44 sm:h-52"
              }`}>
                <img
                  src={currentQuestion.image}
                  alt="Таах баатар"
                  className="max-h-full max-w-full object-contain filter drop-shadow-md select-none transition-all duration-500 rounded-xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-1.5 text-center">
                  <div className={`tracking-widest filter drop-shadow-md select-none transition-all ${
                    gameState === "answered" ? "text-lg" : "text-xl sm:text-2xl"
                  }`}>
                    {currentQuestion.emojis}
                  </div>
                  <p className="text-[9px] text-yellow-400 font-light">Энэ ямар аниме-гийн дүр вэ?</p>
                </div>
              </div>
            )}

            {/* Hint Box */}
            {hintUsedForCurrentQuestion && gameState === "playing" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-3 sm:p-3.5 text-xs text-yellow-300 flex items-start gap-2.5 animate-blur-fade-up"
              >
                <span className="text-base">💡</span>
                <div className="space-y-0.5">
                  <p className="font-bold text-yellow-400">Тусламж идэвхжлээ!</p>
                  <p className="font-light opacity-90 leading-relaxed">
                    Зөв хариултын эхний үсэг: <strong className="text-white">"{currentQuestion.answer[0]}"</strong>, урт: <strong className="text-white">{currentQuestion.answer.length}</strong> үсэг. Хувилбаруудаас 2 буруу хариултыг хаслаа.
                  </p>
                </div>
              </motion.div>
            )}

            {/* INPUT OPTIONS & TEXT FIELD (PLAYING STATE) */}
            {gameState === "playing" && (
              <div className="space-y-4">
                
                 {/* 4 Multi-Choice buttons with interactive states, sounds, shake, and hover glows */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                   {currentChoices.map((opt) => {
                     const isThisSelected = selectedOption === opt;
                     const isThisCorrectAnswer = opt === currentQuestion.answer;
                     const isEliminated = eliminatedChoices.includes(opt);
                     
                     let buttonClass = "bg-white/5 border-white/10 text-white/90 hover:bg-cyan-500/10 hover:border-cyan-400 hover:scale-[1.03] hover:shadow-cyan-500/15 cursor-pointer active:scale-95";
                     
                     if (isEliminated) {
                       buttonClass = "opacity-20 line-through scale-95 border-white/5 pointer-events-none text-gray-500 bg-black/10";
                     } else if (selectedOption !== null) {
                       if (isThisSelected) {
                         if (isCorrect) {
                           buttonClass = "bg-green-600 border-green-400 text-white scale-[1.03] shadow-lg shadow-green-500/20 pointer-events-none";
                         } else {
                           buttonClass = "bg-red-600 border-red-400 text-white scale-[1.03] shadow-lg shadow-red-500/20 animate-shake pointer-events-none";
                         }
                       } else if (isThisCorrectAnswer) {
                         // Reveal the correct option even if player guessed wrong
                         buttonClass = "bg-green-600/30 border-green-500/30 text-green-300 pointer-events-none";
                       } else {
                         buttonClass = "opacity-30 scale-95 pointer-events-none border-white/5";
                       }
                     }

                     return (
                       <button
                         key={opt}
                         onClick={() => handleOptionSelect(opt)}
                         disabled={selectedOption !== null || isEliminated}
                         className={`text-sm py-3.5 px-4 rounded-xl font-medium border text-left transition-all duration-300 shadow-md ${buttonClass}`}
                       >
                         {opt}
                       </button>
                     );
                   })}
                 </div>

                {/* Text guess submission form */}
                <form onSubmit={handleTextSubmit} className="flex gap-2 border-t border-white/5 pt-3">
                  <input
                    type="text"
                    placeholder="Эсвэл хариултаа өөрөө бичнэ үү (Жишээ нь: ванпийс, наруто...)"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white/20 transition-all font-light"
                  />
                  <button
                    type="submit"
                    className="bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-black px-5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    Илгээх
                  </button>
                </form>

              </div>
            )}

            {/* DETAILED FEEDBACK SCREEN (ANSWERED STATE) */}
            {gameState === "answered" && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/10"
              >
                
                {/* Verdict message */}
                <div className="text-center">
                  {isCorrect ? (
                    <div className="text-green-400 font-extrabold text-lg flex items-center justify-center gap-1.5">
                      <Sparkles size={18} className="text-yellow-400 animate-pulse" />
                      МАШ ЗӨВ! (+10 Оноо)
                    </div>
                  ) : (
                    <div className="text-red-400 font-extrabold text-lg flex items-center justify-center gap-1.5 animate-shake">
                      ХАРИУЛТ БУРУУ! (Зөв хариулт: {currentQuestion.answer})
                    </div>
                  )}
                </div>

                {/* Media Presentation: Image & Youtube Trailer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Anime Image */}
                  <div className="rounded-xl overflow-hidden h-40 border border-white/10 relative">
                    <img 
                      src={currentQuestion.image} 
                      alt={currentQuestion.answer} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{currentQuestion.answer}</span>
                    </div>
                  </div>

                  {/* YouTube Trailer Video Iframe */}
                  {currentQuestion.video ? (
                    <div className="space-y-1.5">
                      <div className="rounded-xl overflow-hidden h-40 border border-white/10">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`${getYouTubeEmbedUrl(currentQuestion.video)}?autoplay=1&mute=1`}
                          title={`${currentQuestion.answer} Trailer`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        ></iframe>
                      </div>
                      <div className="flex justify-end">
                        <a
                          href={currentQuestion.video}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-yellow-400 hover:text-yellow-300 hover:underline flex items-center gap-1 transition-colors bg-white/5 px-2 py-1 rounded border border-white/5 hover:border-white/10"
                        >
                          <svg className="w-3 h-3 fill-current text-red-500" viewBox="0 0 24 24">
                            <path d="M23.498 6.163c-.272-1.011-1.066-1.805-2.077-2.077C19.588 3.541 12 3.541 12 3.541s-7.588 0-9.421.545c-1.011.272-1.805 1.066-2.077 2.077C0 8.005 0 12 0 12s0 3.995.502 5.837c.272 1.011 1.066 1.805 2.077 2.077 1.833.545 9.421.545 9.421.545s7.588 0 9.421-.545c1.011-.272 1.805-1.066 2.077-2.077.502-1.842.502-5.837.502-5.837s0-3.995-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <span>YouTube дээр үзэх (Ажиллахгүй бол)</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center p-4 h-40 text-center">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Видео байхгүй</span>
                      <p className="text-xs text-gray-400 font-light">Энэ асуултад видео байхгүй байна.</p>
                    </div>
                  )}
                </div>

                {/* Next button */}
                <button
                  onClick={handleNextQuestion}
                  className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-black font-extrabold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/10"
                >
                  <span>ҮРГЭЛЖЛҮҮЛЭХ</span>
                  <ChevronRight size={18} />
                </button>

              </motion.div>
            )}

              </motion.div>
            </AnimatePresence>

          </div>
        )}

        {/* GAME OVER STATE */}
        {gameState === "gameover" && (
          <div className="flex-1 flex flex-col items-center justify-start text-center py-4 space-y-4 max-h-full overflow-y-auto no-scrollbar">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/5">
              <Heart size={32} className="text-red-500" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-red-500 uppercase">ТОГЛООМ ДУУСЛАА!</h2>
              <p className="text-gray-300 text-xs">Таны 3 амь дууссан тул тоглоом дууслаа.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full max-w-xs flex flex-col items-center">
              <span className="text-[10px] uppercase text-gray-400 tracking-wider">Нийт оноо</span>
              <span className="text-3xl font-black font-mono text-yellow-400">{score} pt</span>
              <span className="text-[10px] text-gray-500 font-mono">Дараалсан зөв хариулт: {consecutive}</span>
            </div>

            {renderScoreSubmission()}

            <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm pt-2">
              <button
                onClick={restartGame}
                className="flex-1 py-3 bg-white text-black hover:bg-gray-200 active:scale-95 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                <RotateCcw size={14} />
                <span>ДАХИН ТОГЛОХ</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 active:scale-95 rounded-xl font-bold transition-all cursor-pointer text-xs text-white"
              >
                ХААХ
              </button>
            </div>
          </div>
        )}

        {/* WIN STATE */}
        {gameState === "win" && (
          <div className="flex-1 flex flex-col items-center justify-start text-center py-4 space-y-4 max-h-full overflow-y-auto no-scrollbar">
            <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl flex items-center justify-center border border-yellow-400/20 shadow-lg shadow-yellow-500/5">
              <Trophy size={32} className="text-yellow-400 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-wide">ТА ЯЛЛАА! 🎉</h2>
              <p className="text-gray-300 text-xs">Амжилттай тааж дууслаа.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full max-w-xs flex flex-col items-center">
              <span className="text-[10px] uppercase text-gray-400 tracking-wider">Эцсийн оноо</span>
              <span className="text-3xl font-black font-mono text-yellow-400">{score} pt</span>
              <span className="text-[10px] text-green-400 font-mono">Шилдэг тоглогч амжилттай!</span>
            </div>

            {renderScoreSubmission()}

            <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm pt-2">
              <button
                onClick={restartGame}
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-black rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                <RotateCcw size={14} />
                <span>ЭХНЭЭС ЭХЛЭХ</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 active:scale-95 rounded-xl font-bold transition-all cursor-pointer text-xs text-white"
              >
                ХААХ
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
