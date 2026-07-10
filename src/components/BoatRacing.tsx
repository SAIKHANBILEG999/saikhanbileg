import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gamepad2,
  Trophy,
  Sparkles,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Anchor,
  Compass,
  Coins,
  ChevronRight,
  Info,
  Timer,
  Navigation,
  Award
} from "lucide-react";
import { saveScore } from "../lib/firebase";
import Leaderboard from "./Leaderboard";

// AUDIO SYSTEM USING WEB AUDIO API
class EngineSound {
  ctx: AudioContext | null = null;
  osc: OscillatorNode | null = null;
  gain: GainNode | null = null;
  filter: BiquadFilterNode | null = null;
  isPlaying: boolean = false;

  constructor() {
    // Lazy initialized when user starts game
  }

  init() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  start() {
    if (!this.ctx) this.init();
    if (!this.ctx || this.isPlaying) return;

    try {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }

      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();
      this.filter = this.ctx.createBiquadFilter();

      // Realistic motor sound: sawtooth wave with lowpass filtering
      this.osc.type = "sawtooth";
      this.osc.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.filter.type = "lowpass";
      this.filter.frequency.setValueAtTime(150, this.ctx.currentTime);

      this.gain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.osc.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.osc.start();
      this.isPlaying = true;
    } catch (e) {
      console.error("Failed to play sound", e);
    }
  }

  setSpeed(speedPercent: number) {
    if (!this.ctx || !this.osc || !this.filter || !this.isPlaying) return;
    try {
      // Scale frequency and filter frequency based on throttle
      const baseFreq = 45 + speedPercent * 65; // 45Hz to 110Hz
      const filterFreq = 150 + speedPercent * 300; // 150Hz to 450Hz
      
      this.osc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
      this.filter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.1);
    } catch (e) {
      // Ignore
    }
  }

  playSplash() {
    if (!this.ctx) return;
    try {
      // Noise splash sound on crash or speed boost
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 400;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  }

  playCoin() {
    if (!this.ctx) return;
    try {
      // Double coin synth beep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }

  stop() {
    if (!this.isPlaying) return;
    try {
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
      }
      this.isPlaying = false;
    } catch (e) {}
  }
}

// DRIVER AVATAR MOCK ASSETS (Animated 3D characters, not real people)
const MALE_DRIVER_AVATAR = "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=150&auto=format&fit=crop";
const FEMALE_DRIVER_AVATAR = "https://images.unsplash.com/photo-1640960543409-dbe56ccc30e2?q=80&w=150&auto=format&fit=crop";

interface Obstacle3D {
  x: number; // side offset (-1 to 1)
  z: number; // distance
  type: "rock" | "barrel" | "coin" | "gate";
  collected?: boolean;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface RivalBoat {
  name: string;
  x: number; // target lane (-0.6 to 0.6)
  currentX: number;
  z: number;
  color: string;
  avatar: string;
  speed: number;
}

interface BoatRacingProps {
  onClose: () => void;
  onCoinsEarned?: (coins: number) => void;
}

export default function BoatRacing({ onClose, onCoinsEarned }: BoatRacingProps) {
  // Screen views: 'setup' | 'playing' | 'results'
  const [screen, setScreen] = useState<"setup" | "playing" | "results">("setup");

  // Selection configurations
  const [selectedWay, setSelectedWay] = useState<"tropical" | "arctic" | "cyber">("tropical");
  const [selectedBoat, setSelectedBoat] = useState<"raptor" | "hydro" | "wave">("raptor");
  const [driverGender, setDriverGender] = useState<"male" | "female">("male");

  // Game UI/HUD State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0); // units per frame
  const [distanceTraveled, setDistanceTraveled] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [coinsCollected, setCoinsCollected] = useState<number>(0);
  const [finalRank, setFinalRank] = useState<number>(3);
  const [collisionFlash, setCollisionFlash] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Leaderboard states
  const [playerName, setPlayerName] = useState<string>("");
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);
  const [savingScore, setSavingScore] = useState<boolean>(false);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<EngineSound>(new EngineSound());
  const requestRef = useRef<number | null>(null);

  // Keyboard control ref
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Physics & Game loop variables (Refs to avoid React re-render lags in 60fps loop)
  const gameRef = useRef({
    distance: 0,
    speed: 0,
    maxSpeed: 100, // Speed limit based on boat type
    acceleration: 0.8,
    deceleration: 0.96,
    steerSpeed: 0.05,
    boatX: 0, // Player side position (-1.5 to 1.5)
    boatY: 0,
    obstacles: [] as Obstacle3D[],
    particles: [] as Particle3D[],
    rivals: [] as RivalBoat[],
    totalDistance: 2500, // Race Length (meters)
    time: 0,
    waveAmplitude: 15,
    waveSpeed: 0.04,
    cameraShake: 0,
    isRaceFinished: false,
    startTime: 0,
    elapsedSeconds: 0,
    boostTimer: 0
  });

  // Track / Way styling info
  const getWayConfig = () => {
    switch (selectedWay) {
      case "arctic":
        return {
          waterColor: "#1d4ed8", // deep glacier blue
          shoreColor: "#f1f5f9", // white snow
          skyGradient: ["#020617", "#0f172a", "#1e1b4b"], // aurora night
          barrierColor: "#38bdf8", // glowing neon blue ice
          obstacleName: "Iceberg Chunk",
          glowingGates: true,
          riverSideGlow: "#06b6d4"
        };
      case "cyber":
        return {
          waterColor: "#4c0519", // dark pink/magenta grid
          shoreColor: "#020617", // pure black cyber grids
          skyGradient: ["#020617", "#1e1b4b", "#581c87"], // neon purple synthwave
          barrierColor: "#f43f5e", // magenta laser
          obstacleName: "Cyber-Grid Barrier",
          glowingGates: true,
          riverSideGlow: "#d946ef"
        };
      case "tropical":
      default:
        return {
          waterColor: "#0d9488", // emerald teal water
          shoreColor: "#fbbf24", // yellow sands
          skyGradient: ["#38bdf8", "#0ea5e9", "#7dd3fc"], // bright sunny sky
          barrierColor: "#15803d", // forest foliage green
          obstacleName: "Tropical Rock",
          glowingGates: false,
          riverSideGlow: "#14b8a6"
        };
    }
  };

  const getBoatConfig = () => {
    switch (selectedBoat) {
      case "hydro":
        return {
          name: "Hydro-Slicer",
          color: "#3b82f6", // Neon Blue
          maxSpeed: 75,
          accel: 0.75,
          handling: "S (Ultra Agile)",
          logoColor: "text-blue-400"
        };
      case "wave":
        return {
          name: "Wave-Cutter",
          color: "#eab308", // Golden Yellow
          maxSpeed: 85,
          accel: 0.5,
          handling: "B (Heavy / Smooth)",
          logoColor: "text-yellow-400"
        };
      case "raptor":
      default:
        return {
          name: "Raptor Jet",
          color: "#ef4444", // Hot Red
          maxSpeed: 65,
          accel: 0.9,
          handling: "A (Perfect Balance)",
          logoColor: "text-red-400"
        };
    }
  };

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      keysPressed.current[key] = true;
      // Handle casing variations to be highly robust
      keysPressed.current[key.toLowerCase()] = true;
      keysPressed.current[key.toUpperCase()] = true;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "W", "a", "A", "s", "S", "d", "D"].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      keysPressed.current[key] = false;
      keysPressed.current[key.toLowerCase()] = false;
      keysPressed.current[key.toUpperCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // START 5-SECOND RACE COUNTDOWN
  const startRaceCountdown = () => {
    setScreen("playing");
    setCountdown(5);

    // Initial Sound
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
          // Start engine hum
          if (!isMuted) {
            audioRef.current.start();
          }
          // Launch game mechanics
          gameRef.current.startTime = Date.now();
          launchGameLoop();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // INITIALIZE SCENE AND GAME DATA
  const initializeGameData = () => {
    const boatConf = getBoatConfig();
    gameRef.current = {
      distance: 0,
      speed: 0,
      maxSpeed: boatConf.maxSpeed,
      acceleration: boatConf.accel,
      deceleration: 0.985,
      steerSpeed: selectedBoat === "hydro" ? 0.08 : selectedBoat === "wave" ? 0.04 : 0.06,
      boatX: 0,
      boatY: 0,
      obstacles: [],
      particles: [],
      rivals: [
        {
          name: "Rival Swift",
          x: -0.4,
          currentX: -0.4,
          z: 30,
          color: "#ec4899", // pink
          avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=100&auto=format&fit=crop",
          speed: boatConf.maxSpeed * 0.75
        },
        {
          name: "Rival Storm",
          x: 0.4,
          currentX: 0.4,
          z: 60,
          color: "#06b6d4", // cyan
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop",
          speed: boatConf.maxSpeed * 0.82
        }
      ],
      totalDistance: 2000, // 2000 meters
      time: 0,
      waveAmplitude: selectedWay === "cyber" ? 8 : selectedWay === "arctic" ? 12 : 16,
      waveSpeed: selectedWay === "cyber" ? 0.08 : 0.04,
      cameraShake: 0,
      isRaceFinished: false,
      startTime: 0,
      elapsedSeconds: 0,
      boostTimer: 0
    };

    setDistanceTraveled(0);
    setElapsedTime(0);
    setCoinsCollected(0);
    setFinalRank(3);
    setCollisionFlash(false);
    setScoreSaved(false);
    setPlayerName("");

    // Create 3D Obstacles, Power-Up rings, and C-Coins distributed along the track
    const obsList: Obstacle3D[] = [];
    for (let z = 200; z < 1950; z += 120) {
      // Alternate type: Coin, Obstacle, Speed Gate
      const coinSpread = Math.random() < 0.6;
      if (coinSpread) {
        obsList.push({
          x: Math.sin(z * 0.01) * 0.7 + (Math.random() * 0.2 - 0.1),
          z,
          type: "coin"
        });
        // small chain of coins
        obsList.push({
          x: Math.sin((z + 15) * 0.01) * 0.7,
          z: z + 15,
          type: "coin"
        });
        obsList.push({
          x: Math.sin((z + 30) * 0.01) * 0.7,
          z: z + 30,
          type: "coin"
        });
      } else if (Math.random() < 0.5) {
        // Boost gates
        obsList.push({
          x: Math.sin(z * 0.02) * 0.5,
          z,
          type: "gate"
        });
      } else {
        // Rocks or barrels
        obsList.push({
          x: (Math.random() > 0.5 ? -0.5 : 0.5) + (Math.random() * 0.4 - 0.2),
          z,
          type: Math.random() > 0.4 ? "rock" : "barrel"
        });
      }
    }
    gameRef.current.obstacles = obsList;
  };

  // MAIN ANIMATION LOOP
  const launchGameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas high DPI size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const run = () => {
      updateGamePhysics();
      renderScene(ctx, rect.width, rect.height);
      
      if (!gameRef.current.isRaceFinished) {
        requestRef.current = requestAnimationFrame(run);
      } else {
        triggerRaceFinished();
      }
    };

    requestRef.current = requestAnimationFrame(run);
  };

  // UPDATE BOAT SPEED, STEER, AND POSITION
  const updateGamePhysics = () => {
    const data = gameRef.current;
    data.time += 1;

    // 1. Throttle Input
    const throttle = keysPressed.current["ArrowUp"] || keysPressed.current["w"] || keysPressed.current["W"];
    const brake = keysPressed.current["ArrowDown"] || keysPressed.current["s"] || keysPressed.current["S"];

    // Boost timer reduction
    if (data.boostTimer > 0) {
      data.boostTimer--;
    }

    const currentMax = data.boostTimer > 0 ? data.maxSpeed * 1.35 : data.maxSpeed;

    if (throttle) {
      data.speed += data.acceleration;
      if (data.speed > currentMax) data.speed = currentMax;
    } else if (brake) {
      data.speed *= 0.9;
    } else {
      data.speed *= data.deceleration; // glide decay
    }

    // Keep speed positive
    if (data.speed < 0.1) data.speed = 0;

    // Update Engine audio pitching
    if (!isMuted) {
      audioRef.current.setSpeed(data.speed / data.maxSpeed);
    }

    // Update distance
    data.distance += data.speed * 0.08; // meters traveled
    setDistanceTraveled(Math.floor(data.distance));

    // Calculate rank
    let rank = 1;
    data.rivals.forEach((rival) => {
      // Rival AI logic
      rival.z += rival.speed * 0.08;
      if (rival.z > data.distance) {
        rank++;
      }
      // AI subtle sway
      rival.currentX += (rival.x - rival.currentX) * 0.03;
      if (Math.abs(rival.currentX - rival.x) < 0.05) {
        rival.x = (Math.random() * 1.2 - 0.6);
      }
    });
    setFinalRank(rank);

    // Speedometer state update
    setCurrentSpeed(Math.floor(data.speed * 1.3)); // scaling for display realism

    // Elapsed Timer
    if (data.startTime > 0) {
      const sec = (Date.now() - data.startTime) / 1000;
      data.elapsedSeconds = sec;
      setElapsedTime(sec);
    }

    // 2. Steering Input (Smooth and bit-by-bit)
    const left = keysPressed.current["ArrowLeft"] || keysPressed.current["a"] || keysPressed.current["A"];
    const right = keysPressed.current["ArrowRight"] || keysPressed.current["d"] || keysPressed.current["D"];

    // Reduce steering factor to turn smoothly bit-by-bit rather than sharply
    const speedSteerFactor = data.speed > 0 ? Math.max(0.3, Math.min(0.8, data.speed / 40)) : 0.3;
    if (left) {
      data.boatX -= data.steerSpeed * speedSteerFactor * 0.35;
    }
    if (right) {
      data.boatX += data.steerSpeed * speedSteerFactor * 0.35;
    }

    // Constrain boat to water bounds
    if (data.boatX < -1.1) {
      data.boatX = -1.1;
      data.speed *= 0.95; // bump wall slowdown
    }
    if (data.boatX > 1.1) {
      data.boatX = 1.1;
      data.speed *= 0.95;
    }

    // Camera shakes decay
    if (data.cameraShake > 0) {
      data.cameraShake *= 0.9;
      if (data.cameraShake < 0.1) data.cameraShake = 0;
    }

    // 3. Spawning Boat Tail Particles
    if (data.speed > 5) {
      const splashCount = Math.floor(data.speed / 15);
      for (let i = 0; i < splashCount; i++) {
        data.particles.push({
          x: data.boatX + (Math.random() * 0.15 - 0.075),
          y: -10 + (Math.random() * 5),
          z: data.distance - 5,
          vx: (Math.random() * 0.04 - 0.02) - (left ? 0.02 : 0) + (right ? 0.02 : 0),
          vy: Math.random() * 10 + 5,
          vz: - (data.speed * 0.1) - (Math.random() * 5),
          color: selectedWay === "cyber" ? "#f43f5e" : "#ffffff",
          size: Math.random() * 4 + 2,
          life: 0,
          maxLife: 20 + Math.random() * 15
        });
      }
    }

    // 4. Update Particle Physics
    data.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.vy -= 0.5; // gravity pull
      p.life++;
    });
    data.particles = data.particles.filter((p) => p.life < p.maxLife);

    // 5. Collision & Collection Detection
    data.obstacles.forEach((obs) => {
      if (obs.collected) return;

      // Distance threshold
      const distZ = obs.z - data.distance;
      if (distZ > -10 && distZ < 15) {
        const sideDist = Math.abs(obs.x - data.boatX);
        if (sideDist < 0.15) {
          // HIT!
          if (obs.type === "coin") {
            obs.collected = true;
            setCoinsCollected((prev) => prev + 1);
            if (!isMuted) audioRef.current.playCoin();
            
            // Collect sparkling gold particles
            for (let i = 0; i < 12; i++) {
              data.particles.push({
                x: obs.x,
                y: 10,
                z: obs.z,
                vx: Math.random() * 0.1 - 0.05,
                vy: Math.random() * 8 + 4,
                vz: Math.random() * 4 - 2,
                color: "#fbbf24",
                size: Math.random() * 3 + 1,
                life: 0,
                maxLife: 30
              });
            }
          } else if (obs.type === "gate") {
            obs.collected = true;
            data.boostTimer = 120; // 2 seconds of boost at 60fps
            if (!isMuted) audioRef.current.playSplash();
            triggerHUDAlert("TURBO SPEED! 🔥");
            
            // Cyber or white turbo blast trail
            for (let i = 0; i < 25; i++) {
              data.particles.push({
                x: data.boatX + (Math.random() * 0.4 - 0.2),
                y: 5,
                z: data.distance + 10,
                vx: Math.random() * 0.08 - 0.04,
                vy: Math.random() * 5 + 2,
                vz: -5 - Math.random() * 10,
                color: "#ec4899",
                size: Math.random() * 5 + 3,
                life: 0,
                maxLife: 25
              });
            }
          } else {
            // ROCK OR BARREL CRASH
            obs.collected = true;
            data.speed *= 0.25; // drop 75% speed
            data.cameraShake = 24;
            setCollisionFlash(true);
            setTimeout(() => setCollisionFlash(false), 200);

            if (!isMuted) audioRef.current.playSplash();
            triggerHUDAlert("WRECK! -75% SPEED 💥");

            // Debris splash
            for (let i = 0; i < 30; i++) {
              data.particles.push({
                x: obs.x + (Math.random() * 0.1 - 0.05),
                y: 15,
                z: obs.z,
                vx: Math.random() * 0.2 - 0.1,
                vy: Math.random() * 15 + 5,
                vz: Math.random() * 10 - 5,
                color: obs.type === "barrel" ? "#b45309" : "#6b7280",
                size: Math.random() * 6 + 3,
                life: 0,
                maxLife: 40
              });
            }
          }
        }
      }
    });

    // End condition
    if (data.distance >= data.totalDistance) {
      data.isRaceFinished = true;
    }
  };

  // SCREEN ALERT TRIGGER
  const [hudAlert, setHudAlert] = useState<string | null>(null);
  const triggerHUDAlert = (text: string) => {
    setHudAlert(text);
    setTimeout(() => {
      setHudAlert((curr) => (curr === text ? null : curr));
    }, 1500);
  };

  // FINISHED CHAMPIONSHIP TRIGGER
  const triggerRaceFinished = () => {
    audioRef.current.stop();
    setScreen("results");
    
    // Pass earned gold coins upwards
    if (onCoinsEarned) {
      const bonusRank = finalRank === 1 ? 150 : finalRank === 2 ? 80 : 30;
      onCoinsEarned(coinsCollected * 5 + bonusRank);
    }
  };

  // CANVAS RENDER PERSPECTIVE ENGINE
  const renderScene = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const data = gameRef.current;
    const way = getWayConfig();
    const boat = getBoatConfig();

    ctx.clearRect(0, 0, width, height);

    // Apply Camera Shake
    ctx.save();
    if (data.cameraShake > 0) {
      const shakeX = (Math.random() * 2 - 1) * data.cameraShake;
      const shakeY = (Math.random() * 2 - 1) * data.cameraShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. RENDER SKYBOX GRADIENT
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.5);
    skyGrad.addColorStop(0, way.skyGradient[0]);
    skyGrad.addColorStop(0.5, way.skyGradient[1]);
    skyGrad.addColorStop(1, way.skyGradient[2]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Render Sun/Moon or Neon Grids in sky
    if (selectedWay === "tropical") {
      ctx.fillStyle = "rgba(253, 224, 71, 0.25)"; // Glowing tropical sun
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.35, 70, 0, Math.PI * 2);
      ctx.fill();
    } else if (selectedWay === "cyber") {
      // Draw horizon wireframe grid line
      ctx.strokeStyle = "rgba(236, 72, 153, 0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, height * 0.2 + i * 20);
        ctx.lineTo(width, height * 0.2 + i * 20);
        ctx.stroke();
      }
    } else if (selectedWay === "arctic") {
      // Aurora overlay
      ctx.fillStyle = "rgba(34, 211, 238, 0.08)";
      ctx.beginPath();
      ctx.ellipse(width * 0.3, height * 0.2, 180, 50, Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. PSEUDO-3D WATER RIVER RENDERING
    const horizonY = height * 0.45;
    const viewDistance = 700; // units visible ahead
    const cameraZ = data.distance;

    // Draw solid water background
    ctx.fillStyle = way.waterColor;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(width, horizonY);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // DRAW DYNAMIC WATER WAVES & COYOTE BANK MESH lines
    const waveTime = data.time * data.waveSpeed;
    const linesCount = 40;
    
    for (let i = linesCount; i > 0; i--) {
      const z = (i * (viewDistance / linesCount));
      const scale = 300 / z; // perspective scale factor
      
      // Calculate Wave elevation offset
      const yWave = Math.sin(z * 0.04 - waveTime) * data.waveAmplitude;
      
      const screenY = horizonY + (scale * (160 + yWave));
      if (screenY > height) continue;

      const riverWidth = 700 * scale; // narrowing down to the horizon
      const trackCenterX = (width * 0.5) + (Math.sin(z * 0.015) * 50 * scale) - (data.boatX * riverWidth);
      const leftX = trackCenterX - riverWidth;
      const rightX = trackCenterX + riverWidth;

      // Render Shore sands/icebanks
      ctx.fillStyle = way.shoreColor;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(leftX, screenY);
      ctx.lineTo(leftX - (50 * scale), screenY + 5);
      ctx.lineTo(0, screenY + 10);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(width, screenY);
      ctx.lineTo(rightX, screenY);
      ctx.lineTo(rightX + (50 * scale), screenY + 5);
      ctx.lineTo(width, screenY + 10);
      ctx.fill();

      // Cyber grid lines across water
      if (selectedWay === "cyber" && i % 3 === 0) {
        ctx.strokeStyle = "rgba(217, 70, 239, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftX, screenY);
        ctx.lineTo(rightX, screenY);
        ctx.stroke();
      }

      // Draw glowing boundary buoys/ice rocks along the sides
      if (i % 6 === 0) {
        ctx.fillStyle = way.barrierColor;
        // Left buoy
        ctx.beginPath();
        ctx.arc(leftX, screenY - (10 * scale), 12 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Right buoy
        ctx.beginPath();
        ctx.arc(rightX, screenY - (10 * scale), 12 * scale, 0, Math.PI * 2);
        ctx.fill();

        if (way.glowingGates) {
          ctx.shadowColor = way.riverSideGlow;
          ctx.shadowBlur = 8;
          ctx.strokeStyle = way.riverSideGlow;
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(leftX, screenY - (10 * scale), 16 * scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      }
    }

    // 3. RENDER 3D PROJECTED OBSTACLES, COINS & SPEED GATES
    data.obstacles.forEach((obs) => {
      const obsZ = obs.z - cameraZ;
      if (obsZ <= 5 || obsZ > viewDistance) return; // out of view segment range

      const scale = 300 / obsZ;
      const yWave = Math.sin(obs.z * 0.04 - waveTime) * data.waveAmplitude;
      const screenY = horizonY + (scale * (160 + yWave));

      const riverWidth = 700 * scale;
      const trackCenterX = (width * 0.5) + (Math.sin(obs.z * 0.015) * 50 * scale) - (data.boatX * riverWidth);
      const screenX = trackCenterX + (obs.x * riverWidth);

      // Clip objects offscreen
      if (screenX < 0 || screenX > width || screenY > height) return;

      if (obs.type === "coin") {
        if (obs.collected) return;
        // Spin gold coin
        const spin = Math.sin(data.time * 0.1) * (14 * scale);
        ctx.fillStyle = "#f59e0b";
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(screenX, screenY - (20 * scale), Math.max(1, Math.abs(spin)), 14 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Little gold shimmer dot
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(screenX - (spin * 0.3), screenY - (22 * scale), 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === "gate") {
        // Boost Gate: Arching glow circle
        ctx.save();
        ctx.strokeStyle = obs.collected ? "rgba(16, 185, 129, 0.3)" : "rgba(236, 72, 153, 0.85)";
        ctx.lineWidth = 6 * scale;
        ctx.shadowColor = "rgba(236, 72, 153, 0.6)";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(screenX, screenY - (24 * scale), 32 * scale, Math.PI, 0, false); // top arch
        ctx.stroke();
        ctx.restore();

        // Text tag on gate
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(8, 12 * scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("TURBO", screenX, screenY - (50 * scale));
      } else {
        // Draw Rock or Barrel
        if (obs.collected) return;
        
        ctx.fillStyle = obs.type === "rock" ? "#4b5563" : "#854d0e"; // slate vs brown barrel
        ctx.strokeStyle = obs.type === "rock" ? "#1f2937" : "#713f12";
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        if (obs.type === "rock") {
          // jagged rock polygon
          ctx.moveTo(screenX - (25 * scale), screenY);
          ctx.lineTo(screenX - (15 * scale), screenY - (35 * scale));
          ctx.lineTo(screenX + (10 * scale), screenY - (38 * scale));
          ctx.lineTo(screenX + (28 * scale), screenY);
        } else {
          // barrel cylinder
          ctx.moveTo(screenX - (16 * scale), screenY);
          ctx.lineTo(screenX - (16 * scale), screenY - (32 * scale));
          ctx.lineTo(screenX + (16 * scale), screenY - (32 * scale));
          ctx.lineTo(screenX + (16 * scale), screenY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Shadow detail on obstacle
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, 24 * scale, 5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4. RENDER RIVAL BOATS (AI OPPONENTS)
    data.rivals.forEach((rival) => {
      const rZ = rival.z - cameraZ;
      if (rZ <= 5 || rZ > viewDistance) return;

      const scale = 300 / rZ;
      const yWave = Math.sin(rival.z * 0.04 - waveTime) * data.waveAmplitude;
      const screenY = horizonY + (scale * (160 + yWave));

      const riverWidth = 700 * scale;
      const trackCenterX = (width * 0.5) + (Math.sin(rival.z * 0.015) * 50 * scale) - (data.boatX * riverWidth);
      const screenX = trackCenterX + (rival.currentX * riverWidth);

      // Render Opponent Yacht/Boat
      ctx.fillStyle = rival.color;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;

      // Draw boat hull
      ctx.beginPath();
      ctx.moveTo(screenX - (20 * scale), screenY);
      ctx.lineTo(screenX - (15 * scale), screenY - (18 * scale));
      ctx.lineTo(screenX + (15 * scale), screenY - (18 * scale));
      ctx.lineTo(screenX + (20 * scale), screenY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cabin/Windshield
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(screenX - (10 * scale), screenY - (18 * scale));
      ctx.lineTo(screenX - (6 * scale), screenY - (26 * scale));
      ctx.lineTo(screenX + (6 * scale), screenY - (26 * scale));
      ctx.lineTo(screenX + (10 * scale), screenY - (18 * scale));
      ctx.closePath();
      ctx.fill();

      // Rival Nametag
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(8, 10 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(rival.name, screenX, screenY - (32 * scale));

      // Bubble splashes behind rival
      if (data.speed > 5) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(screenX - (5 * scale), screenY, 6 * scale, 0, Math.PI * 2);
        ctx.arc(screenX + (5 * scale), screenY, 5 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 5. RENDER PARTICLES (SPRAYS, ACCIDENT BUBBLES)
    data.particles.forEach((p) => {
      const pZ = p.z - cameraZ;
      if (pZ <= 5 || pZ > viewDistance) return;

      const scale = 300 / pZ;
      const screenY = horizonY + (scale * (160 - p.y));

      const riverWidth = 700 * scale;
      const trackCenterX = (width * 0.5) + (Math.sin(p.z * 0.015) * 50 * scale) - (data.boatX * riverWidth);
      const screenX = trackCenterX + (p.x * riverWidth);

      const pSize = Math.max(1, p.size * scale);

      ctx.fillStyle = p.color;
      ctx.globalAlpha = 1.0 - (p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(screenX, screenY, pSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0; // restore
    });

    // 6. RENDER PLAYER'S BOAT (Drawn in front center of screen)
    // Boat tilts based on steer and speed
    const isSteeringLeft = keysPressed.current["ArrowLeft"] || keysPressed.current["a"] || keysPressed.current["A"];
    const isSteeringRight = keysPressed.current["ArrowRight"] || keysPressed.current["d"] || keysPressed.current["D"];

    let targetTilt = 0;
    if (isSteeringLeft) targetTilt = -0.22;
    if (isSteeringRight) targetTilt = 0.22;

    // smooth lerp
    data.boatY += (targetTilt - data.boatY) * 0.12;

    const playerSizeX = 72;
    const playerSizeY = 44;
    const playerBaseX = width * 0.5;
    const playerBaseY = height - 70;

    ctx.save();
    ctx.translate(playerBaseX, playerBaseY);
    ctx.rotate(data.boatY);

    // Dynamic water foam trail directly beneath the player hull
    const foamPulse = Math.sin(data.time * 0.3) * 6;
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 34 + foamPulse, 10 + foamPulse * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // MAIN BOAT HULL
    ctx.fillStyle = boat.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Pointy bow (nose of speedboat pointing forward/up)
    ctx.moveTo(0, -playerSizeY);
    ctx.lineTo(-playerSizeX * 0.4, -playerSizeY * 0.3);
    ctx.lineTo(-playerSizeX * 0.5, playerSizeY * 0.5);
    ctx.lineTo(playerSizeX * 0.5, playerSizeY * 0.5);
    ctx.lineTo(playerSizeX * 0.4, -playerSizeY * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // DECK LINES
    ctx.fillStyle = "#1e293b"; // dark deck floor
    ctx.beginPath();
    ctx.moveTo(0, -playerSizeY * 0.65);
    ctx.lineTo(-playerSizeX * 0.3, -playerSizeY * 0.1);
    ctx.lineTo(-playerSizeX * 0.35, playerSizeY * 0.4);
    ctx.lineTo(playerSizeX * 0.35, playerSizeY * 0.4);
    ctx.lineTo(playerSizeX * 0.3, -playerSizeY * 0.1);
    ctx.closePath();
    ctx.fill();

    // SPOILER / FINS
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-playerSizeX * 0.45, playerSizeY * 0.2, 10, 15);
    ctx.fillRect(playerSizeX * 0.45 - 10, playerSizeY * 0.2, 10, 15);

    // GLASS COCKPIT / WINDSHIELD
    ctx.fillStyle = "rgba(56, 189, 248, 0.8)";
    ctx.beginPath();
    ctx.moveTo(0, -playerSizeY * 0.4);
    ctx.lineTo(-playerSizeX * 0.22, -playerSizeY * 0.1);
    ctx.lineTo(-playerSizeX * 0.22, playerSizeY * 0.1);
    ctx.lineTo(playerSizeX * 0.22, playerSizeY * 0.1);
    ctx.lineTo(playerSizeX * 0.22, -playerSizeY * 0.1);
    ctx.closePath();
    ctx.fill();

    // DRIVER PROFILE PIC INSIDE COCKPIT (Glow representation of male/female)
    ctx.fillStyle = driverGender === "male" ? "#3b82f6" : "#ec4899";
    ctx.beginPath();
    ctx.arc(0, playerSizeY * 0.05, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore(); // end camera shake
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 select-none font-sans overflow-hidden">
      
      {/* GLOWING AMBIENT BACKGROUND */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* RENDER VIEW: SETUP */}
      <AnimatePresence mode="wait">
        {screen === "setup" && (
          <motion.div
            key="setup-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl p-6 md:p-8 rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin text-white flex flex-col space-y-6"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Anchor className="text-cyan-400 animate-pulse" size={24} />
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                    3D Boat Racing Challenge
                  </h2>
                  <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-mono">
                    Бодит 3D усан завины уралдаан
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

            {/* Config Panels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* PANEL 1: DRIVER GENDER */}
              <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Compass size={16} className="text-cyan-400" />
                  <span className="text-xs uppercase font-bold tracking-wider">1. Жолооч Сонгох (Driver)</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                  Уралдах жолоочийн хүйсийг сонгосноор таны тоглоомын дүр өөрчлөгдөнө.
                </p>

                <div className="flex-1 grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setDriverGender("male")}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                      driverGender === "male"
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                        : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-xs font-bold">Эрэгтэй дүр (Male)</p>
                      <span className="text-[9px] opacity-70">3D Animated Avatar</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setDriverGender("female")}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                      driverGender === "female"
                        ? "bg-pink-500/20 border-pink-500 text-pink-300"
                        : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-xs font-bold">Эмэгтэй дүр (Female)</p>
                      <span className="text-[9px] opacity-70">3D Animated Avatar</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* PANEL 2: SELECT BOAT */}
              <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Anchor size={16} className="text-yellow-400" />
                  <span className="text-xs uppercase font-bold tracking-wider">2. Завь Сонгох (Boat)</span>
                </div>
                
                <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                  {[
                    { id: "raptor", name: "Raptor Jet", desc: "Хурдан улаан завь. Тэнцвэртэй.", speed: "95 WPM", color: "border-red-500/40 text-red-400" },
                    { id: "hydro", name: "Hydro-Slicer", desc: "Маневр сайтай. Хөх неон өнгө.", speed: "110 WPM", color: "border-blue-500/40 text-blue-400" },
                    { id: "wave", name: "Wave-Cutter", desc: "Дээд хурд ихтэй, хүнд алтан завь.", speed: "125 WPM", color: "border-yellow-500/40 text-yellow-400" }
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBoat(b.id as any)}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedBoat === b.id
                          ? "bg-zinc-900 border-white/40 text-white"
                          : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">{b.name}</p>
                        <span className="text-[10px] font-light text-zinc-400">{b.desc}</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/60 border ${b.color}`}>
                        {b.speed}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PANEL 3: SELECT WAY / COURSE */}
              <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 flex flex-col">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Navigation size={16} className="text-purple-400" />
                  <span className="text-xs uppercase font-bold tracking-wider">3. Зам сонгох (Way)</span>
                </div>

                <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                  {[
                    { id: "tropical", name: "Халуун Орны Гол", label: "Tropical River", desc: "Ногоон ой, гүн цэнхэр тунгалаг ус.", color: "text-emerald-400 border-emerald-500/20" },
                    { id: "arctic", name: "Мөсөн Хавцал", label: "Arctic Glacier", desc: "Хүйтэн мөсөн уулс, туйлын туяа.", color: "text-cyan-400 border-cyan-500/20" },
                    { id: "cyber", name: "Неон Давалгаа", label: "Cyber Neo-Tokyo", desc: "Футурист Токио, ягаан неон гэрэл.", color: "text-purple-400 border-purple-500/20" }
                  ].map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWay(w.id as any)}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedWay === w.id
                          ? "bg-zinc-900 border-white/40 text-white"
                          : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          <span>{w.name}</span>
                          <span className="text-[8px] font-normal opacity-60">({w.label})</span>
                        </p>
                        <span className="text-[10px] font-light text-zinc-400">{w.desc}</span>
                      </div>
                      <ChevronRight size={14} className="opacity-40" />
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Launch Button */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-white/10">
              <div className="flex items-center gap-6 text-xs text-zinc-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <Coins size={14} className="text-yellow-400 animate-bounce" />
                  <span>Уралдаж C-Coins цуглуулах боломжтой!</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Info size={14} className="text-cyan-400" />
                  <span>Steer: Arrow Keys / WASD</span>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
                  title="Toggle Audio"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <button
                  onClick={() => {
                    initializeGameData();
                    startRaceCountdown();
                  }}
                  className="flex-1 sm:flex-initial px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 active:scale-95 text-white font-black text-sm tracking-wider uppercase transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={16} fill="white" />
                  <span>START CHAMPIONSHIP</span>
                </button>
              </div>
            </div>

          </motion.div>
        )}

        {/* RENDER VIEW: PLAYING GAME (3D CANVAS INTERFACE) */}
        {screen === "playing" && (
          <motion.div
            key="playing-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`w-full max-w-5xl h-[85vh] md:h-[80vh] rounded-3xl overflow-hidden relative border shadow-2xl flex flex-col bg-slate-950 transition-all ${
              collisionFlash ? "border-red-500 shadow-red-500/20" : "border-white/15"
            }`}
          >
            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 mb-2">Prepare Boat Engines</p>
                <motion.span
                  key={countdown}
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="text-7xl md:text-8xl font-black bg-gradient-to-tr from-cyan-400 to-pink-500 bg-clip-text text-transparent"
                >
                  {countdown}
                </motion.span>
                <div className="mt-6 flex items-center gap-2 text-xs text-zinc-400">
                  <Info size={14} className="text-cyan-400" />
                  <span>Завиа баруун, зүүн тийш удирдан уралдаарай!</span>
                </div>
              </div>
            )}

            {/* In-game HUD alert overlay */}
            {hudAlert && (
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="px-6 py-2.5 rounded-full bg-black/80 border border-white/20 backdrop-blur-sm text-sm font-black text-center text-yellow-400 tracking-wider shadow-lg"
                >
                  {hudAlert}
                </motion.div>
              </div>
            )}

            {/* Game Main Canvas */}
            <div className="relative flex-1 w-full min-h-0">
              <canvas ref={canvasRef} className="w-full h-full block" />

              {/* Floating Responsive Touch & Mouse Steering Overlays */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-30 pointer-events-auto">
                <button
                  onMouseDown={() => { keysPressed.current["ArrowLeft"] = true; }}
                  onMouseUp={() => { keysPressed.current["ArrowLeft"] = false; }}
                  onMouseLeave={() => { keysPressed.current["ArrowLeft"] = false; }}
                  onTouchStart={(e) => { e.preventDefault(); keysPressed.current["ArrowLeft"] = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); keysPressed.current["ArrowLeft"] = false; }}
                  className="w-14 h-14 rounded-full bg-cyan-500/20 active:bg-cyan-500/50 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-black text-xl cursor-pointer select-none shadow-lg active:scale-95 transition-all"
                  title="Зүүн тийш жолоодох (Left)"
                >
                  ◀
                </button>
                <div className="hidden sm:block text-center font-mono text-[9px] text-zinc-400 bg-black/85 px-3 py-1 rounded-full border border-white/5 select-none">
                  ДАРЖ ЭСВЭЛ ХУРУУГААРАА ЖОЛООДНО
                </div>
                <button
                  onMouseDown={() => { keysPressed.current["ArrowRight"] = true; }}
                  onMouseUp={() => { keysPressed.current["ArrowRight"] = false; }}
                  onMouseLeave={() => { keysPressed.current["ArrowRight"] = false; }}
                  onTouchStart={(e) => { e.preventDefault(); keysPressed.current["ArrowRight"] = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); keysPressed.current["ArrowRight"] = false; }}
                  className="w-14 h-14 rounded-full bg-cyan-500/20 active:bg-cyan-500/50 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-black text-xl cursor-pointer select-none shadow-lg active:scale-95 transition-all"
                  title="Баруун тийш жолоодох (Right)"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* GAME BOTTOM HUD CONTROLS */}
            <div className="bg-black/90 border-t border-white/10 p-4 md:p-6 flex items-center justify-between z-10 font-mono text-white">
              
              {/* Profile Details */}
              <div className="flex items-center gap-3">
                <img
                  src={driverGender === "male" ? MALE_DRIVER_AVATAR : FEMALE_DRIVER_AVATAR}
                  alt="Driver"
                  className="w-10 h-10 rounded-full border border-white/15 object-cover"
                />
                <div className="text-left">
                  <p className="text-[10px] font-bold text-zinc-400">DRIVER / ЖОЛООЧ</p>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    {driverGender === "male" ? "Эрэгтэй дүр" : "Эмэгтэй дүр"}
                  </h4>
                </div>
              </div>

              {/* Speedometer widget */}
              <div className="flex items-center gap-8 text-center">
                <div>
                  <p className="text-[9px] font-bold text-zinc-400">SPEED</p>
                  <p className="text-lg md:text-2xl font-black text-cyan-400 tracking-tighter">
                    {currentSpeed} <span className="text-[10px] text-zinc-500">KM/H</span>
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-zinc-400">DISTANCE</p>
                  <p className="text-lg md:text-2xl font-black text-yellow-400 tracking-tighter">
                    {distanceTraveled} <span className="text-[10px] text-zinc-500">M</span>
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-zinc-400">TIME</p>
                  <p className="text-lg md:text-2xl font-black text-white tracking-tighter flex items-center justify-center gap-1">
                    <Timer size={14} className="text-zinc-500" />
                    <span>{elapsedTime.toFixed(1)}s</span>
                  </p>
                </div>
              </div>

              {/* Race coins count */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[9px] font-bold text-zinc-400">RANK</p>
                  <div className="flex items-center justify-end gap-1">
                    <Trophy size={14} className="text-yellow-400" />
                    <span className="text-sm md:text-lg font-black text-yellow-400">{finalRank} / 3</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[9px] font-bold text-zinc-400">COINS</p>
                  <div className="flex items-center justify-end gap-1 text-emerald-400">
                    <Coins size={14} className="animate-spin" style={{ animationDuration: "3s" }} />
                    <span className="text-sm md:text-lg font-black">{coinsCollected}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quit back-door button */}
            <button
              onClick={() => {
                audioRef.current.stop();
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                setScreen("setup");
              }}
              className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 text-[10px] text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              Quit Race
            </button>
          </motion.div>
        )}

        {/* RENDER VIEW: CHAMPIONSHIP RESULTS */}
        {screen === "results" && (
          <motion.div
            key="results-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto no-scrollbar p-6 md:p-8 rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl relative text-white text-center flex flex-col space-y-5"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/20 mx-auto animate-bounce shrink-0">
              <Award className="text-yellow-400" size={28} />
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                RACE COMPLETED!
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">БАРИАНД АМЖИЛТТАЙ ОРЛОО</p>
            </div>

            {/* Results Grid details */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3 text-left text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-zinc-400">Байр (Final Rank):</span>
                <span className={`font-black ${finalRank === 1 ? "text-yellow-400" : finalRank === 2 ? "text-zinc-300" : "text-amber-600"}`}>
                  {finalRank}-р Байр ({finalRank === 1 ? "Winner 🏆" : finalRank === 2 ? "2nd Place 🥈" : "3rd Place 🥉"})
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-zinc-400">Нийт хугацаа (Total Time):</span>
                <span className="font-mono font-bold text-white">{elapsedTime.toFixed(2)} секунд</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-zinc-400">Цуглуулсан зоос (Gold Coins):</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <Coins size={14} />
                  <span>{coinsCollected}ш (+{coinsCollected * 5} C-Coins)</span>
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-zinc-400">Бонус Шагнал (Championship Bonus):</span>
                <span className="font-bold text-yellow-400">
                  +{finalRank === 1 ? 150 : finalRank === 2 ? 80 : 30} C-Coins
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Авсан оноо (Leaderboard Score):</span>
                <span className="font-black text-cyan-400 font-mono">
                  {Math.max(10, Math.round((1000 - elapsedTime * 5) + (coinsCollected * 10) + (4 - finalRank) * 100))} pt
                </span>
              </div>
            </div>

            {/* Leaderboard Section */}
            {scoreSaved ? (
              <div className="w-full mt-2 animate-fade-in text-left">
                <Leaderboard mode="boat" allowModeSwitching={false} />
              </div>
            ) : (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!playerName.trim() || savingScore) return;
                  setSavingScore(true);
                  try {
                    const finalScore = Math.max(10, Math.round((1000 - elapsedTime * 5) + (coinsCollected * 10) + (4 - finalRank) * 100));
                    await saveScore(playerName.trim(), finalScore, "boat");
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

            <p className="text-[10px] font-mono text-zinc-500 leading-relaxed shrink-0">
              Таны цуглуулсан C-Coins автоматаар Roblox Game Hub дахь таны хэтэвчинд (wallet) нэмэгдсэн байна!
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1 shrink-0">
              <button
                onClick={() => setScreen("setup")}
                className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-zinc-300"
              >
                <RotateCcw size={14} />
                <span>Дахин уралдах</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Буцах (Game Hub)</span>
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
