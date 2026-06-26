import React, { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Award, Zap, Volume2, VolumeX, Sparkles, Trophy } from "lucide-react";

// Web Audio API Sound Generator for Retro Feel
const playSound = (type: "jump" | "coin" | "gameover" | "start", isMuted: boolean) => {
  if (isMuted) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "jump") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "coin") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.08); // B5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "gameover") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === "start") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn("Audio Context failed:", e);
  }
};

export default function MinecraftRunner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem("minecraft_runner_highscore") || "0");
  });
  const [isMuted, setIsMuted] = useState(false);

  // References to keep game loop variables without triggering re-renders
  const stateRef = useRef({
    gameState: "idle",
    score: 0,
    speed: 5.5,
    player: {
      x: 80,
      y: 180,
      width: 28,
      height: 48,
      vy: 0,
      jumpForce: -10,
      gravity: 0.5,
      isGrounded: false,
      animationFrame: 0,
    },
    obstacles: [] as Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      type: "lava" | "spike" | "creeper";
      color: string;
    }>,
    diamonds: [] as Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      collected: boolean;
    }>,
    backgroundOffset: 0,
    particles: [] as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
    }>,
    spawnTimer: 0,
    diamondTimer: 0,
  });

  // Keep stateRef synced with gameState and score
  useEffect(() => {
    stateRef.current.gameState = gameState;
  }, [gameState]);

  // Load highscore
  useEffect(() => {
    localStorage.setItem("minecraft_runner_highscore", highScore.toString());
  }, [highScore]);

  // Sound Mute Toggle helper
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Jump trigger
  const triggerJump = () => {
    const s = stateRef.current;
    if (s.gameState === "playing" && s.player.isGrounded) {
      s.player.vy = s.player.jumpForce;
      s.player.isGrounded = false;
      playSound("jump", isMuted);
      
      // Add dust particles at feet
      for (let i = 0; i < 8; i++) {
        s.particles.push({
          x: s.player.x + s.player.width / 2,
          y: s.player.y + s.player.height,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 3 + 2,
          color: "rgba(255, 255, 255, 0.4)",
          life: 1,
        });
      }
    } else if (s.gameState === "idle") {
      startGame();
    } else if (s.gameState === "gameover") {
      restartGame();
    }
  };

  // Key and click listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        triggerJump();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameState, isMuted]);

  const startGame = () => {
    const s = stateRef.current;
    s.gameState = "playing";
    s.score = 0;
    s.speed = 5.5;
    s.player.y = 180;
    s.player.vy = 0;
    s.player.isGrounded = false;
    s.obstacles = [];
    s.diamonds = [];
    s.particles = [];
    s.spawnTimer = 0;
    s.diamondTimer = 0;
    setScore(0);
    setGameState("playing");
    playSound("start", isMuted);
  };

  const restartGame = () => {
    startGame();
  };

  // Main Canvas Rendering & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const s = stateRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const groundY = height - 60;

      // 1. UPDATE GAME STATE IF PLAYING
      if (s.gameState === "playing") {
        // Apply Gravity to Player
        s.player.vy += s.player.gravity;
        s.player.y += s.player.vy;

        // Ground Collision
        if (s.player.y >= groundY - s.player.height) {
          s.player.y = groundY - s.player.height;
          s.player.vy = 0;
          s.player.isGrounded = true;
        }

        // Animate Player Walk
        s.player.animationFrame += 0.15;

        // Background scrolling
        s.backgroundOffset = (s.backgroundOffset - s.speed * 0.2) % width;

        // Spawn Obstacles
        s.spawnTimer++;
        const spawnInterval = Math.max(70, 140 - Math.floor(s.score * 1.5));
        if (s.spawnTimer > spawnInterval) {
          s.spawnTimer = 0;
          const types: Array<"lava" | "spike" | "creeper"> = ["lava", "spike", "creeper"];
          const type = types[Math.floor(Math.random() * types.length)];
          
          let obsHeight = 24 + Math.random() * 16;
          let obsWidth = 20 + Math.random() * 15;
          let yPos = groundY - obsHeight;
          let color = "#ef4444"; // default red for spike

          if (type === "lava") {
            obsHeight = 14;
            obsWidth = 35 + Math.random() * 15;
            yPos = groundY; // on/in the ground
            color = "#f97316"; // Orange lava
          } else if (type === "creeper") {
            obsHeight = 35;
            obsWidth = 18;
            yPos = groundY - obsHeight;
            color = "#22c55e"; // Green creeper
          }

          s.obstacles.push({
            x: width,
            y: yPos,
            width: obsWidth,
            height: obsHeight,
            type,
            color,
          });
        }

        // Spawn Diamonds
        s.diamondTimer++;
        if (s.diamondTimer > 90) {
          s.diamondTimer = 0;
          // Spawn slightly higher up for jumping target
          s.diamonds.push({
            x: width,
            y: groundY - 50 - Math.random() * 60,
            width: 14,
            height: 18,
            collected: false,
          });
        }

        // Update Obstacles
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const obs = s.obstacles[i];
          obs.x -= s.speed;

          // Collision Detection (Box vs Box with slight margin padding for fairness)
          const px = s.player.x + 4;
          const py = s.player.y + 2;
          const pw = s.player.width - 8;
          const ph = s.player.height - 4;

          const ox = obs.x + 2;
          const oy = obs.y + 2;
          const ow = obs.width - 4;
          const oh = obs.height - 4;

          if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
            // COLLISION! Game Over
            s.gameState = "gameover";
            setGameState("gameover");
            playSound("gameover", isMuted);
            
            // Generate Explosion Particles
            for (let p = 0; p < 25; p++) {
              s.particles.push({
                x: s.player.x + s.player.width / 2,
                y: s.player.y + s.player.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 5 + 3,
                color: obs.type === "lava" ? "#f97316" : obs.type === "creeper" ? "#22c55e" : "#ef4444",
                life: 1,
              });
            }
          }

          // Remove offscreen
          if (obs.x + obs.width < 0) {
            s.obstacles.splice(i, 1);
            s.score += 1;
            setScore(s.score);
            // Increase speed slowly
            if (s.score % 5 === 0) {
              s.speed = Math.min(12, s.speed + 0.3);
            }
          }
        }

        // Update Diamonds
        for (let i = s.diamonds.length - 1; i >= 0; i--) {
          const dia = s.diamonds[i];
          dia.x -= s.speed;

          // Catch Diamond
          const px = s.player.x;
          const py = s.player.y;
          const pw = s.player.width;
          const ph = s.player.height;

          if (!dia.collected && px < dia.x + dia.width && px + pw > dia.x && py < dia.y + dia.height && py + ph > dia.y) {
            dia.collected = true;
            s.score += 5; // Diamonds give huge bonus!
            setScore(s.score);
            playSound("coin", isMuted);

            // Generate Diamond Sparkle Particles
            for (let p = 0; p < 10; p++) {
              s.particles.push({
                x: dia.x + dia.width / 2,
                y: dia.y + dia.height / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 3 + 2,
                color: "#38bdf8", // Sky blue sparkle
                life: 1,
              });
            }
          }

          // Remove offscreen or collected
          if (dia.x + dia.width < 0 || dia.collected) {
            s.diamonds.splice(i, 1);
          }
        }

        // Update High Score immediately if current is higher
        if (s.score > highScore) {
          setHighScore(s.score);
        }
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // 2. DRAW EVERYTHING ON CANVAS

      // A. Clear background with cool cave/night color
      ctx.fillStyle = "#111827"; // Dark slate
      ctx.fillRect(0, 0, width, height);

      // B. Draw Distant Cave Mountains/Blocks (scrolling background)
      ctx.fillStyle = "#1f2937"; // Lighter dark slate
      const numBgBlocks = 12;
      const bgBlockWidth = width / 8;
      for (let i = 0; i < numBgBlocks; i++) {
        const xPos = (i * bgBlockWidth + s.backgroundOffset) % (width + bgBlockWidth) - bgBlockWidth;
        const hVal = 80 + (i % 3) * 20;
        ctx.fillRect(xPos, groundY - hVal, bgBlockWidth + 1, hVal);
      }

      // C. Draw Lava Streams in the far background
      ctx.fillStyle = "#7c2d12"; // Deep dark red/orange lava
      ctx.fillRect(0, groundY - 4, width, 4);

      // D. Draw Ground (Minecraft grass/dirt voxel style)
      // Dirt Base
      ctx.fillStyle = "#451a03"; // Brown dirt
      ctx.fillRect(0, groundY, width, height - groundY);
      // Grass Top layer (blocks)
      ctx.fillStyle = "#15803d"; // Green grass
      ctx.fillRect(0, groundY, width, 12);
      ctx.fillStyle = "#166534"; // Darker green pixel accent
      for (let x = 0; x < width; x += 16) {
        if ((x / 16) % 2 === 0) {
          ctx.fillRect(x, groundY + 6, 16, 6);
        }
      }

      // E. Draw Diamonds
      s.diamonds.forEach((dia) => {
        if (dia.collected) return;
        ctx.fillStyle = "#38bdf8"; // Sky blue diamond color
        
        // Draw voxel-art style diamond gem shape
        const cx = dia.x + dia.width / 2;
        const cy = dia.y + dia.height / 2;
        
        ctx.beginPath();
        ctx.moveTo(cx, dia.y); // Top
        ctx.lineTo(dia.x + dia.width, cy); // Right
        ctx.lineTo(cx, dia.y + dia.height); // Bottom
        ctx.lineTo(dia.x, cy); // Left
        ctx.closePath();
        ctx.fill();

        // Inner shine pixel
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(cx - 2, cy - 4, 3, 3);
      });

      // F. Draw Obstacles
      s.obstacles.forEach((obs) => {
        ctx.fillStyle = obs.color;

        if (obs.type === "lava") {
          // Glow and wave effect
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.fillStyle = "#f97316"; // Bright orange top bubble
          ctx.fillRect(obs.x + 2, obs.y, obs.width - 4, 4);
          ctx.fillStyle = "#facc15"; // Yellow spark
          if (Math.random() > 0.6) {
            ctx.fillRect(obs.x + Math.random() * obs.width, obs.y - 2, 3, 3);
          }
        } else if (obs.type === "spike") {
          // Draw Redstone spikes
          const spikeWidth = obs.width / 3;
          for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(obs.x + k * spikeWidth, obs.y + obs.height);
            ctx.lineTo(obs.x + k * spikeWidth + spikeWidth / 2, obs.y);
            ctx.lineTo(obs.x + (k + 1) * spikeWidth, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();
          }
        } else if (obs.type === "creeper") {
          // Minecraft Creeper Face and Body
          // Main Body
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          // Dark face features
          ctx.fillStyle = "#000000";
          ctx.fillRect(obs.x + 3, obs.y + 4, 4, 4); // left eye
          ctx.fillRect(obs.x + obs.width - 7, obs.y + 4, 4, 4); // right eye
          ctx.fillRect(obs.x + obs.width / 2 - 2, obs.y + 8, 4, 6); // mouth
          ctx.fillRect(obs.x + obs.width / 2 - 4, obs.y + 11, 8, 3); // mouth bottom
        }
      });

      // G. Draw Particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1.0; // reset
      });

      // H. Draw Player (Minecraft Girl voxel style)
      if (s.gameState === "playing" || s.gameState === "idle") {
        const px = s.player.x;
        const py = s.player.y;
        const pw = s.player.width;
        const ph = s.player.height;

        // Legs motion (sinusoidal offset when grounded)
        let legOffset = 0;
        if (s.player.isGrounded && s.gameState === "playing") {
          legOffset = Math.sin(s.player.animationFrame) * 6;
        }

        // Draw Hair (Brown)
        ctx.fillStyle = "#4a2a18"; // Dark brown hair
        ctx.fillRect(px, py, pw, 14); // Hair top
        ctx.fillRect(px, py, 6, 26); // Left side hair
        ctx.fillRect(px + pw - 6, py, 6, 26); // Right side hair

        // Draw Face (Skin)
        ctx.fillStyle = "#fbcfe8"; // Soft pinkish skin tone / Minecraft Girl style
        ctx.fillRect(px + 4, py + 10, pw - 8, 14);

        // Draw Eyes (Minecraft square eyes)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px + 6, py + 14, 4, 3); // Left eye white
        ctx.fillRect(px + pw - 10, py + 14, 4, 3); // Right eye white
        ctx.fillStyle = "#312e81"; // Dark blue pupil
        ctx.fillRect(px + 6, py + 14, 2, 3);
        ctx.fillRect(px + pw - 10, py + 14, 2, 3);

        // Smile
        ctx.fillStyle = "#f43f5e"; // Rose pink mouth
        ctx.fillRect(px + pw / 2 - 2, py + 21, 4, 1.5);

        // Sweater (Off-white / Cozy pinkish-white)
        ctx.fillStyle = "#f5f5f5"; // Cozy off-white
        ctx.fillRect(px + 2, py + 24, pw - 4, 16);

        // Pants (Blue jeans)
        ctx.fillStyle = "#60a5fa"; // Soft blue jeans
        // Left leg
        ctx.fillRect(px + 3, py + 40, 8, 8 + (legOffset > 0 ? legOffset : 0));
        // Right leg
        ctx.fillRect(px + pw - 11, py + 40, 8, 8 + (legOffset < 0 ? -legOffset : 0));

        // Boots (White/pink sneakers)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px + 3, py + 40 + 8 + (legOffset > 0 ? legOffset : 0) - 2, 8, 3);
        ctx.fillRect(px + pw - 11, py + 40 + 8 + (legOffset < 0 ? -legOffset : 0) - 2, 8, 3);
      }

      // 3. OVERLAYS IF IDLE OR GAMEOVER
      if (s.gameState === "idle") {
        // Overlay dark screen slightly
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, width, height);
      }

      // Loop
      animationId = requestAnimationFrame(render);
    };

    // Set initial size and start loop
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = 360; // Keep fixed beautiful height
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, [gameState, isMuted]);

  return (
    <div className="w-full flex flex-col items-center select-none" ref={containerRef}>
      
      {/* Top Bar (Score & Sound controls) */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-white font-mono">
            <Sparkles size={14} className="text-yellow-400 animate-pulse" />
            <span>ОНОО: <strong className="text-yellow-300 font-bold">{score}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-gray-300 font-mono">
            <Trophy size={14} className="text-yellow-500" />
            <span>РЕКОРД: <strong className="text-white font-bold">{highScore}</strong></span>
          </div>
        </div>

        {/* Mute and Help Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white"
            title={isMuted ? "Дууг нээх" : "Дууг хаах"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-green-400" />}
          </button>
        </div>
      </div>

      {/* Canvas Area Container */}
      <div 
        onClick={triggerJump}
        className="w-full relative h-[360px] bg-gray-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* IDLE SCREEN OVERLAY */}
        {gameState === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center mb-5 animate-bounce shadow-lg shadow-yellow-500/20">
              <Play size={28} className="text-black fill-black ml-1" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
              Minecraft Diamond Dash
            </h3>
            <p className="text-sm text-gray-300 max-w-sm mt-2 font-light leading-relaxed">
              Лаав болон аюултай саадуудыг үсэрч даван алмаз цуглуулаарай! Үсрэхийн тулд суман товчлуур, <strong>Space</strong> эсвэл дэлгэц дээр дарна уу.
            </p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="mt-6 px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm rounded-full transition-all transform hover:scale-105 shadow-lg active:scale-95"
            >
              Тоглоомыг Эхлэх
            </button>
          </div>
        )}

        {/* GAMEOVER SCREEN OVERLAY */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5 text-red-500 shadow-inner">
              <RotateCcw size={28} className="animate-spin-slow" />
            </div>
            <h3 className="text-3xl font-extrabold text-red-500 tracking-wider font-mono">
              GAME OVER
            </h3>
            <p className="text-sm text-gray-300 mt-2 font-light">
              Лааванд уначихлаа эсвэл саадыг мөргөлөө!
            </p>
            
            <div className="flex gap-4 mt-4 bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl font-mono">
              <div className="text-xs text-gray-400 border-r border-white/10 pr-4 text-left">
                Одоогийн оноо: <br/>
                <strong className="text-yellow-400 text-base font-bold">{score}</strong>
              </div>
              <div className="text-xs text-gray-400 text-left pl-1">
                Дээд рекорд: <br/>
                <strong className="text-white text-base font-bold">{highScore}</strong>
              </div>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                restartGame();
              }}
              className="mt-6 px-6 py-2.5 bg-white hover:bg-gray-100 text-black font-bold text-sm rounded-full transition-all transform hover:scale-105 shadow-lg active:scale-95 flex items-center gap-2"
            >
              <RotateCcw size={16} />
              <span>Дахин Тоглох</span>
            </button>
          </div>
        )}

        {/* Tiny touch cue during game */}
        {gameState === "playing" && (
          <div className="absolute bottom-4 right-4 text-[10px] text-white/30 font-mono bg-black/20 px-2 py-1 rounded border border-white/5 backdrop-blur-sm pointer-events-none sm:hidden">
            Дарж үсэрнэ
          </div>
        )}
      </div>

      {/* Control Instruction Tip */}
      <p className="text-[11px] text-gray-500 text-center mt-3 max-w-md">
        💡 <strong>ЗӨВЛӨГӨӨ:</strong> Алмаз цуглуулбал <strong>+5 оноо</strong> олгох бөгөөд саад давах тутамд <strong>+1 оноо</strong> нэмэгдэж тоглоом улам хурдасна!
      </p>

    </div>
  );
}
