import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Sparkles,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Timer,
  Award,
  ChevronRight,
  Info
} from "lucide-react";
import { saveScore } from "../lib/firebase";
import Leaderboard from "./Leaderboard";

// Web Audio API helper for swimming strokes & water splashes
class SplashSound {
  ctx: AudioContext | null = null;

  init() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("AudioContext not supported", e);
    }
  }

  playSplash(pitch: number = 1) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      // Create noise buffer for splash sound
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 350 * pitch;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {
      // Ignore audio errors
    }
  }

  playWhistle() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = ctxCreateGain(this.ctx);
      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch (e) {}
  }

  playCheer() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    try {
      // Synth win chime
      const osc = this.ctx.createOscillator();
      const gain = ctxCreateGain(this.ctx);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, this.ctx.currentTime + 0.3); // C6

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.6);
    } catch (e) {}
  }
}

function ctxCreateGain(ctx: AudioContext) {
  return ctx.createGain();
}

const MALE_SWIMMER_AVATAR = "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=250&auto=format&fit=crop";
const FEMALE_SWIMMER_AVATAR = "https://images.unsplash.com/photo-1640960543409-dbe56ccc30e2?q=80&w=250&auto=format&fit=crop";

interface SwimmerParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface RivalSwimmer {
  name: string;
  lane: number;
  progress: number; // 0 to distance
  speed: number;
  avatar: string;
  gender: "male" | "female";
  swimCycle: number;
  finished?: boolean;
}

interface SwimmingRaceProps {
  onClose: () => void;
  onCoinsEarned?: (coins: number) => void;
}

export default function SwimmingRace({ onClose, onCoinsEarned }: SwimmingRaceProps) {
  // Screen states: 'setup' | 'playing' | 'results'
  const [screen, setScreen] = useState<"setup" | "playing" | "results">("setup");

  // Custom configurations
  const [selectedGender, setSelectedGender] = useState<"male" | "female">("male");
  const [raceDistance, setRaceDistance] = useState<number>(100); // meters (e.g. 50, 100, 200)

  // Game UI/HUD States
  const [countdown, setCountdown] = useState<number | null>(null);
  const [playerProgress, setPlayerProgress] = useState<number>(0);
  const [playerSpeed, setPlayerSpeed] = useState<number>(0); // relative speed
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [finalRank, setFinalRank] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cooldownMessage, setCooldownMessage] = useState<string>("");

  // Leaderboard states
  const [playerName, setPlayerName] = useState<string>("");
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);
  const [savingScore, setSavingScore] = useState<boolean>(false);

  // Alternating stroke mechanics
  const [lastStroke, setLastStroke] = useState<"left" | "right" | null>(null);

  // Canvas and audio references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<SplashSound>(new SplashSound());
  const requestRef = useRef<number | null>(null);

  // References to keep game loop variables running without lag
  const gameRef = useRef({
    playerX: 50, // pixel coordinate
    playerProgress: 0, // meters
    playerSpeed: 0,
    maxSpeed: 4.5, // maximum speed reachable
    drag: 0.965, // drag factor representing water resistance
    rivals: [] as RivalSwimmer[],
    particles: [] as SwimmerParticle[],
    time: 0,
    startTime: 0,
    isRaceFinished: false,
    elapsedSeconds: 0,
    playerCycle: 0, // for stroke animated arms
  });

  // Start 3 second countdown and initialize audio
  const startRaceCountdown = () => {
    setScreen("playing");
    setCountdown(3);

    if (!isMuted) {
      audioRef.current.init();
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          clearInterval(timer);
          return null;
        }
        if (prev === 1) {
          clearInterval(timer);
          if (!isMuted) {
            audioRef.current.playWhistle();
          }
          gameRef.current.startTime = Date.now();
          launchGameLoop();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Set up initial positions of rivals and resetting stats
  const initializeRaceData = () => {
    setPlayerProgress(0);
    setPlayerSpeed(0);
    setElapsedTime(0);
    setFinalRank(1);
    setLastStroke(null);
    setCooldownMessage("");
    setScoreSaved(false);
    setPlayerName("");

    gameRef.current = {
      playerX: 50,
      playerProgress: 0,
      playerSpeed: 0,
      maxSpeed: raceDistance === 50 ? 5.0 : raceDistance === 100 ? 4.5 : 4.0, // endurance vs sprint
      drag: 0.958,
      rivals: [
        {
          name: "Rival Altan",
          lane: 0,
          progress: 0,
          speed: 0,
          gender: "male",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop",
          swimCycle: 0
        },
        {
          name: "Rival Nomin",
          lane: 2,
          progress: 0,
          speed: 0,
          gender: "female",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop",
          swimCycle: 0
        }
      ],
      particles: [],
      time: 0,
      startTime: 0,
      isRaceFinished: false,
      elapsedSeconds: 0,
      playerCycle: 0
    };
  };

  useEffect(() => {
    if (screen === "playing") {
      initializeRaceData();
    }
  }, [screen]);

  // Main canvas animation frame triggers
  const launchGameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const run = () => {
      updatePhysics();
      renderPool(ctx, rect.width, rect.height);

      if (!gameRef.current.isRaceFinished) {
        requestRef.current = requestAnimationFrame(run);
      } else {
        triggerFinishRace();
      }
    };

    requestRef.current = requestAnimationFrame(run);
  };

  // Keyboard shortcut keys for swimming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== "playing" || countdown !== null || gameRef.current.isRaceFinished) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        performStroke("left");
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        performStroke("right");
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [screen, countdown, lastStroke]);

  // Action executed when pressing swim stroke button (Left/Right alternating)
  const performStroke = (arm: "left" | "right") => {
    if (gameRef.current.isRaceFinished || countdown !== null) return;

    const data = gameRef.current;

    // Check if player alternated
    if (lastStroke === arm) {
      // Penalty for double stroke on same arm
      data.playerSpeed *= 0.82; // slowdown
      setCooldownMessage("Ээлжилж дар! (Alternate arms!)");
      if (!isMuted) audioRef.current.playSplash(0.5); // clumsy splash
    } else {
      // Good stroke
      setCooldownMessage("");
      setLastStroke(arm);

      // Add speed
      const strokePower = raceDistance === 50 ? 1.4 : raceDistance === 100 ? 1.15 : 0.95;
      data.playerSpeed += strokePower;
      if (data.playerSpeed > data.maxSpeed) {
        data.playerSpeed = data.maxSpeed;
      }

      // Add a nice visual cycle
      data.playerCycle += Math.PI * 0.5;

      // Play stroke splash sound
      if (!isMuted) {
        audioRef.current.playSplash(1.1 + Math.random() * 0.2);
      }

      // Generate pool spray particles
      for (let i = 0; i < 15; i++) {
        data.particles.push({
          x: data.playerX + (Math.random() * 30 - 15),
          y: 0, // surface
          vx: - (data.playerSpeed * 1.5) - (Math.random() * 3),
          vy: Math.random() * 4 - 2,
          color: "rgba(224, 242, 254, 0.8)", // ice white splash
          size: Math.random() * 4 + 1.5,
          life: 0,
          maxLife: 20 + Math.random() * 20
        });
      }
    }
  };

  const updatePhysics = () => {
    const data = gameRef.current;
    data.time += 1;

    // 1. Friction / Water resistance
    data.playerSpeed *= data.drag;
    if (data.playerSpeed < 0.05) data.playerSpeed = 0;
    setPlayerSpeed(parseFloat(data.playerSpeed.toFixed(1)));

    // 2. Increase meters progress based on current speed
    data.playerProgress += data.playerSpeed * 0.12;
    setPlayerProgress(data.playerProgress);

    // End condition
    if (data.playerProgress >= raceDistance) {
      data.playerProgress = raceDistance;
      data.isRaceFinished = true;
    }

    // 3. Update Rivals progress with natural realistic swimming logic
    data.rivals.forEach((rival, idx) => {
      if (rival.progress >= raceDistance) {
        rival.progress = raceDistance;
        rival.finished = true;
        return;
      }

      // Rival AI swimming speed is rhythmic
      const waveFreq = idx === 0 ? 0.03 : 0.025;
      const baseSwimSpeed = raceDistance === 50 ? 1.95 : raceDistance === 100 ? 1.7 : 1.45;
      const variance = Math.sin(data.time * waveFreq) * 0.6 + 0.35;
      rival.speed = baseSwimSpeed + variance;

      rival.progress += rival.speed * 0.12;
      rival.swimCycle += 0.12;

      if (rival.progress >= raceDistance) {
        rival.progress = raceDistance;
        rival.finished = true;
      }

      // Add automatic water trail splashes for rivals
      if (data.time % 15 === 0) {
        for (let i = 0; i < 4; i++) {
          data.particles.push({
            x: 50 + (rival.progress * 5) + (Math.random() * 20 - 10),
            y: 0,
            vx: -3 - Math.random() * 2,
            vy: Math.random() * 2 - 1,
            color: "rgba(207, 250, 254, 0.5)",
            size: Math.random() * 3 + 1,
            life: 0,
            maxLife: 15
          });
        }
      }
    });

    // 4. Calculate dynamic Rank positioning
    let rank = 1;
    data.rivals.forEach((r) => {
      if (r.finished) {
        rank++;
      } else if (r.progress > data.playerProgress) {
        rank++;
      }
    });
    setFinalRank(rank);

    // 5. Track elapsed timer
    if (data.startTime > 0) {
      const sec = (Date.now() - data.startTime) / 1000;
      data.elapsedSeconds = sec;
      setElapsedTime(sec);
    }

    // 6. Update general particles
    data.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
    });
    data.particles = data.particles.filter((p) => p.life < p.maxLife);
  };

  const renderPool = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const data = gameRef.current;

    // A. CLEAR WATER CONTAINER
    ctx.fillStyle = "#0284c7"; // rich pool blue
    ctx.fillRect(0, 0, width, height);

    // Lane Dimensions
    const headerHeight = 40;
    const poolHeight = height - headerHeight;
    const laneHeight = poolHeight / 3;

    // B. DRAW LANE DIVIDERS (Red & Yellow floats)
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    for (let i = 1; i < 3; i++) {
      const laneY = headerHeight + i * laneHeight;
      ctx.beginPath();
      ctx.moveTo(0, laneY);
      ctx.lineTo(width, laneY);
      ctx.stroke();

      // Floating markers
      ctx.fillStyle = "#facc15"; // yellow floaters
      for (let x = 20; x < width; x += 40) {
        ctx.beginPath();
        ctx.arc(x, laneY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // C. DRAW START & FINISH LINES
    // Start grid at 50px
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, headerHeight, 50, poolHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, headerHeight);
    ctx.lineTo(50, height);
    ctx.stroke();

    // Finish line depends on window width
    const finishX = width - 80;
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.fillRect(finishX, headerHeight, 80, poolHeight);

    // Checkered pattern finish line
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(finishX, headerHeight);
    ctx.lineTo(finishX, height);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    const sqSize = 10;
    for (let y = headerHeight; y < height; y += sqSize * 2) {
      ctx.fillRect(finishX + 5, y, sqSize, sqSize);
      ctx.fillRect(finishX + 5 + sqSize, y + sqSize, sqSize, sqSize);
    }

    // Lane Labels (1, 2, 3)
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 3; i++) {
      ctx.fillText(
        (i + 1).toString(),
        25,
        headerHeight + i * laneHeight + laneHeight * 0.5
      );
    }

    // D. DRAW PARTICLES & WATER RIPPLES
    data.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1.0 - p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0; // Restore

    // E. DRAW RIVAL SWIMMERS
    data.rivals.forEach((rival) => {
      const laneY = headerHeight + rival.lane * laneHeight + laneHeight * 0.5;
      // Map progress (0 to raceDistance) to screen coordinate (50 to finishX)
      const ratio = rival.progress / raceDistance;
      const screenX = 50 + ratio * (finishX - 50);

      drawSwimmerSprite(ctx, screenX, laneY, rival.gender, rival.swimCycle, rival.name, rival.color || "#e11d48");
    });

    // F. DRAW PLAYER SWIMMER
    const playerLaneY = headerHeight + 1 * laneHeight + laneHeight * 0.5;
    const playerRatio = data.playerProgress / raceDistance;
    const playerScreenX = 50 + playerRatio * (finishX - 50);
    // Sync ref for particle generators
    data.playerX = playerScreenX;

    drawSwimmerSprite(ctx, playerScreenX, playerLaneY, selectedGender, data.playerCycle, "ТҮҮН (YOU)", "#06b6d4");

    // Splash behind player if moving fast
    if (data.playerSpeed > 1) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(playerScreenX - 35, playerLaneY, 12, 0, Math.PI * 2);
      ctx.arc(playerScreenX - 45, playerLaneY + 4, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawSwimmerSprite = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    gender: "male" | "female",
    swimCycle: number,
    name: string,
    capColor: string
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // 1. Water Ripple Ring around swimmer
    const waveSize = 25 + Math.sin(swimCycle * 2) * 5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, waveSize, 12, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Swimmer Torso (Drawn top-down view)
    ctx.fillStyle = "#fed7aa"; // healthy skin tone
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Swimming Trunks / Swimsuit
    ctx.fillStyle = capColor;
    if (gender === "female") {
      // Full body swimsuit
      ctx.beginPath();
      ctx.ellipse(-4, 0, 14, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Short trunks
      ctx.beginPath();
      ctx.ellipse(-8, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Alternating Swimming Arms (Goggles crawl movement)
    ctx.fillStyle = "#fed7aa";
    const leftArmAngle = Math.sin(swimCycle) * 0.9;
    const rightArmAngle = Math.cos(swimCycle) * 0.9;

    // Left Arm
    ctx.save();
    ctx.translate(6, -8);
    ctx.rotate(leftArmAngle);
    ctx.fillRect(0, -3, 14, 5); // shoulder stroke
    ctx.restore();

    // Right Arm
    ctx.save();
    ctx.translate(6, 8);
    ctx.rotate(-rightArmAngle);
    ctx.fillRect(0, -2, 14, 5);
    ctx.restore();

    // 5. Head with Swimming Cap & Goggles
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(14, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Cap
    ctx.fillStyle = capColor;
    ctx.beginPath();
    ctx.arc(12, 0, 7.5, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();

    // Black goggles line
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(15, -4, 2, 8);
    ctx.fillStyle = "#38bdf8"; // cyan lenses
    ctx.fillRect(16, -3, 1.5, 2.5);
    ctx.fillRect(16, 0.5, 1.5, 2.5);

    // 6. Leg kick splash bubbles at the rear
    const kickFactor = Math.sin(swimCycle * 3.5) * 4;
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(-26, kickFactor, 5, 0, Math.PI * 2);
    ctx.arc(-30, -kickFactor * 0.8, 4, 0, Math.PI * 2);
    ctx.fill();

    // 7. Text Label above swimmer
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, 0, -18);

    ctx.restore();
  };

  const triggerFinishRace = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (!isMuted) {
      audioRef.current.playCheer();
    }
    setScreen("results");

    // Earn some virtual Coins based on rank!
    const reward = finalRank === 1 ? 150 : finalRank === 2 ? 80 : 40;
    if (onCoinsEarned) {
      onCoinsEarned(reward);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 select-none font-sans overflow-hidden">
      
      {/* GLOWING WATER GRADIENTS */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        
        {/* SETUP SCREEN */}
        {screen === "setup" && (
          <motion.div
            key="setup-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-3xl p-6 md:p-8 rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin text-white flex flex-col space-y-6"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <span className="text-xl">🏊</span>
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Swimming Championship
                  </h2>
                  <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-mono">
                    Бодит Усан Спортын Уралдаан
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={12} />
                <span>Хаах (Exit)</span>
              </button>
            </div>

            {/* Config Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* CHOOSE GENDER */}
              <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col">
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="text-xs uppercase font-bold tracking-wider">1. Тамирчны Хүйс (Swimmer Gender)</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                  Уралдах тамирчны дүр болон хүйсийг сонгоно уу.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setSelectedGender("male")}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                      selectedGender === "male"
                        ? "bg-blue-500/20 border-blue-500 text-blue-300"
                        : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-xs font-bold">Эрэгтэй Тамирчин</p>
                      <span className="text-[9px] opacity-70">Male Swimmer</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedGender("female")}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                      selectedGender === "female"
                        ? "bg-pink-500/20 border-pink-500 text-pink-300"
                        : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-xs font-bold">Эмэгтэй Тамирчин</p>
                      <span className="text-[9px] opacity-70">Female Swimmer</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* CHOOSE DISTANCE */}
              <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="text-xs uppercase font-bold tracking-wider">2. Зайны Сонголт (Distance)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed mt-1">
                    Сэлж уралдах замын уртыг тохируулаарай. Зай уртсах тусам тамирчны тэсвэр хатуужил шаардагдана.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-4">
                  {[50, 100, 200].map((dist) => (
                    <button
                      key={dist}
                      onClick={() => setRaceDistance(dist)}
                      className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        raceDistance === dist
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/5"
                          : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-lg font-black">{dist}m</div>
                      <span className="text-[8px] opacity-70 uppercase tracking-widest block mt-0.5">
                        {dist === 50 ? "Sprint" : dist === 100 ? "Medium" : "Endurance"}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="bg-blue-950/30 border border-blue-900/40 p-3 rounded-xl mt-4 flex items-start gap-2 text-xs text-blue-300">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p className="leading-tight text-[10px]">
                    <strong>Удирдамж:</strong> Утсаар тоглож буй бол <strong>ЗҮҮН ГАР</strong> болон <strong>БАРУУН ГАР</strong> товчлууруудыг ээлжлэн маш хурдан товшиж сэлнэ. Компьютероос бол <strong>A / D</strong> эсвэл <strong>ArrowLeft / ArrowRight</strong> ээлжлэн дарна.
                  </p>
                </div>
              </div>

            </div>

            {/* Launcher button */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={startRaceCountdown}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 font-black text-base uppercase tracking-widest text-white transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={18} fill="white" />
                <span>Эхлэх (START CHAMPIONSHIP)</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ACTIVE GAME / PLAYING STATE */}
        {screen === "playing" && (
          <motion.div
            key="playing-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-5xl h-[85vh] md:h-[80vh] rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between text-white"
          >
            {/* Header / Top HUD */}
            <div className="bg-zinc-900 px-6 py-3 border-b border-white/5 flex justify-between items-center z-20 shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono font-bold text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                  Уралдах зай: <span className="text-cyan-400">{raceDistance}m</span>
                </span>
                <span className="text-xs font-mono font-bold text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 flex items-center gap-1.5">
                  <Timer size={13} className="text-cyan-400" />
                  <span>{elapsedTime.toFixed(2)}s</span>
                </span>
              </div>

              {/* Title label */}
              <div className="text-center hidden md:block">
                <h4 className="text-xs uppercase tracking-widest font-black text-cyan-400 font-mono">
                  Swimming Competition / Сэлэлтийн Уралдаан
                </h4>
              </div>

              {/* Sound toggle / Exit */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300"
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <button
                  onClick={() => setScreen("setup")}
                  className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-[10px] uppercase font-bold text-red-400 tracking-wider transition-all"
                >
                  Цуцлах (Quit)
                </button>
              </div>
            </div>

            {/* GAME COUNTDOWN OVERLAY */}
            <AnimatePresence>
              {countdown !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 1.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex flex-col items-center justify-center"
                >
                  <p className="text-xs uppercase tracking-widest font-bold text-cyan-400 mb-2 font-mono">Тамирчид бэлэн!</p>
                  <motion.span
                    key={countdown}
                    initial={{ scale: 0.3 }}
                    animate={{ scale: 1 }}
                    className="text-7xl font-black text-white font-mono drop-shadow-[0_4px_12px_rgba(6,182,212,0.3)]"
                  >
                    {countdown}
                  </motion.span>
                  <p className="text-[11px] text-zinc-400 font-light mt-4 font-mono">Гарааг хүлээж байна...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CANVAS CONTAINER */}
            <div className="flex-1 w-full bg-[#0284c7] relative min-h-0">
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
              />

              {/* STROKE PROGRESS BAR HUD METRICS OVERLAY */}
              <div className="absolute top-4 left-4 right-4 z-10 flex gap-4 pointer-events-none select-none">
                <div className="bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/5 text-[10px] font-mono flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-zinc-500">Миний зай</span>
                    <span className="text-white font-bold text-sm mt-0.5">
                      {Math.floor(playerProgress)}m / {raceDistance}m
                    </span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-zinc-500">Байрлал</span>
                    <span className={`font-black text-sm mt-0.5 ${finalRank === 1 ? "text-yellow-400" : "text-zinc-300"}`}>
                      {finalRank} / 3-р байр
                    </span>
                  </div>
                </div>

                {/* Alternating Arm stroke helper visual */}
                {countdown === null && (
                  <div className="ml-auto bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 text-[10px] font-mono flex items-center gap-3 animate-pulse">
                    <span className="text-zinc-400">СУРГАЛТ:</span>
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold ${lastStroke === "right" ? "bg-cyan-500 text-black animate-scale-up" : "bg-zinc-800 text-zinc-500"}`}>
                        LEFT (A)
                      </span>
                      <span className="text-zinc-500">➔</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${lastStroke === "left" ? "bg-cyan-500 text-black animate-scale-up" : "bg-zinc-800 text-zinc-500"}`}>
                        RIGHT (D)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* COOLDOWN / ERROR WRONG KEY WARNING OVERLAY */}
              {cooldownMessage && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/90 text-white backdrop-blur-md px-4 py-2 rounded-xl border border-red-500 font-bold text-xs font-mono animate-bounce z-20 pointer-events-none select-none">
                  ⚠️ {cooldownMessage}
                </div>
              )}
            </div>

            {/* BOTTOM DOCK: TAPPING INTERACTION CONTROLS */}
            <div className="bg-zinc-900 border-t border-white/10 p-5 md:p-6 shrink-0 z-20 flex flex-col items-center gap-4">
              
              <p className="text-xs text-zinc-400 font-mono text-center">
                Тамирчнаа хурдасгахын тулд <strong>ЗҮҮН ГАР</strong>, <strong>БАРУУН ГАР</strong> товчлууруудыг ээлжлэн маш хурдан дараарай!
              </p>

              <div className="flex items-center gap-8 md:gap-12 w-full max-w-lg justify-center">
                
                {/* LEFT ARM TRIGGER */}
                <button
                  onMouseDown={() => performStroke("left")}
                  className={`flex-1 py-5 rounded-2xl font-black text-sm md:text-base tracking-wider transition-all select-none border shadow-md active:scale-95 cursor-pointer ${
                    lastStroke === "left"
                      ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-60"
                      : "bg-gradient-to-b from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-cyan-400 text-white shadow-cyan-500/10"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">🫱</span>
                    <span>ЗҮҮН ГАР (L-Stroke)</span>
                    <span className="text-[10px] opacity-70 font-mono">[A key эсвэл ◀]</span>
                  </div>
                </button>

                {/* CENTRAL SPEEDOMETER INDICATOR */}
                <div className="flex flex-col items-center justify-center font-mono">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Усанд Сэлэх Хурд</span>
                  <p className="text-2xl font-black text-cyan-400 mt-1">
                    {playerSpeed} <span className="text-xs text-zinc-500">m/s</span>
                  </p>
                </div>

                {/* RIGHT ARM TRIGGER */}
                <button
                  onMouseDown={() => performStroke("right")}
                  className={`flex-1 py-5 rounded-2xl font-black text-sm md:text-base tracking-wider transition-all select-none border shadow-md active:scale-95 cursor-pointer ${
                    lastStroke === "right"
                      ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed opacity-60"
                      : "bg-gradient-to-b from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-cyan-400 text-white shadow-cyan-500/10"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">🫲</span>
                    <span>БАРУУН ГАР (R-Stroke)</span>
                    <span className="text-[10px] opacity-70 font-mono">[D key эсвэл ▶]</span>
                  </div>
                </button>

              </div>

            </div>
          </motion.div>
        )}

        {/* GAME RESULTS VIEW */}
        {screen === "results" && (
          <motion.div
            key="results-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto no-scrollbar p-6 md:p-8 rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl relative text-white flex flex-col text-center space-y-5"
          >
            {/* Victory decoration */}
            <div className="flex flex-col items-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-3xl animate-bounce shrink-0">
                🏆
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-yellow-400">
                БАРИАНД ОРЛОО!
              </h2>
              <p className="text-xs text-zinc-400 uppercase tracking-widest font-mono">
                Race Results / Тэмцээний үр дүн
              </p>
            </div>

            {/* Scorecard table */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 divide-y divide-white/5 text-xs sm:text-sm text-left">
              <div className="flex justify-between py-2">
                <span className="text-zinc-400 font-medium">Таны Байрлал:</span>
                <span className={`font-black flex items-center gap-1 ${finalRank === 1 ? "text-yellow-400" : "text-white"}`}>
                  <Award size={14} />
                  <span>{finalRank}-р байр ({finalRank === 1 ? "Алт" : finalRank === 2 ? "Мөнгө" : "Хүрэл"} медаль)</span>
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400 font-medium">Нийт хугацаа:</span>
                <span className="font-mono font-bold text-zinc-200">{elapsedTime.toFixed(2)} секунд</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400 font-medium">Уралдах зай:</span>
                <span className="font-mono text-zinc-200 font-semibold">{raceDistance} метр</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400 font-medium">Шагнал зоос:</span>
                <span className="font-mono text-yellow-400 font-black">
                  +{finalRank === 1 ? 150 : finalRank === 2 ? 80 : 40} C-Coins
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400 font-medium">Авсан оноо (Leaderboard Score):</span>
                <span className="font-mono text-cyan-400 font-black">
                  {Math.max(10, Math.round((1000 - elapsedTime * 5) + (4 - finalRank) * 200))} pt
                </span>
              </div>
            </div>

            {/* Leaderboard Section */}
            {scoreSaved ? (
              <div className="w-full mt-1 animate-fade-in text-left">
                <Leaderboard mode="swimming" allowModeSwitching={false} />
              </div>
            ) : (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!playerName.trim() || savingScore) return;
                  setSavingScore(true);
                  try {
                    const finalScore = Math.max(10, Math.round((1000 - elapsedTime * 5) + (4 - finalRank) * 200));
                    await saveScore(playerName.trim(), finalScore, "swimming");
                    setScoreSaved(true);
                  } catch (err) {
                    console.error("Error saving score:", err);
                  } finally {
                    setSavingScore(false);
                  }
                }} 
                className="w-full space-y-2 bg-white/5 border border-white/10 rounded-2xl p-4 mt-1 text-left"
              >
                <span className="text-[10px] uppercase text-zinc-400 tracking-wider block font-bold text-center">Оноогоо самбарт хадгалах</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Таны нэр..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={savingScore}
                    className="flex-1 bg-white/5 border border-white/15 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all text-center font-bold"
                  />
                  <button
                    type="submit"
                    disabled={savingScore || !playerName.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    {savingScore ? "Бүртгэж байна..." : "Хадгалах"}
                  </button>
                </div>
              </form>
            )}

            {/* Back action */}
            <div className="flex gap-4 pt-1 shrink-0">
              <button
                onClick={() => setScreen("setup")}
                className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold border border-white/10 uppercase tracking-widest transition-all cursor-pointer text-zinc-300"
              >
                Дахин сэлэх (Retry)
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-xs font-black uppercase tracking-widest text-white transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Хаах (Exit Game)
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
