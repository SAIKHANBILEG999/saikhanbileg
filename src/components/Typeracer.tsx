import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Keyboard, 
  Users, 
  Play, 
  X, 
  ArrowLeft, 
  Copy, 
  Check, 
  RefreshCw, 
  Trophy, 
  Sparkles, 
  Timer,
  Zap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";

interface PlayerState {
  name: string;
  wpm: number;
  progress: number; // 0 to 100
  accuracy: number;
  finished: boolean;
  joinedAt: string;
  finishedAt?: string | null;
}

interface RoomData {
  text: string;
  status: "waiting" | "countdown" | "playing" | "finished";
  createdAt: any;
  startTime?: any;
  players: {
    [playerId: string]: PlayerState;
  };
}

// Browser-synthesized Web Audio effects for premium UI responsiveness
const playSound = (type: "click" | "error" | "countdown" | "start" | "finish") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = ctx.destination;

    if (type === "click") {
      // Gentle mechanical keyboard sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === "error") {
      // Subtle alert/buzz sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "countdown") {
      // Standard clock countdown tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "start") {
      // Joyful high frequency double beep
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain1.gain.setValueAtTime(0.06, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(dest);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6
      gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc2.connect(gain2);
      gain2.connect(dest);

      osc1.start();
      osc2.start(ctx.currentTime + 0.08);
      osc1.stop(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.25);
    } else if (type === "finish") {
      // Ascending triumphant chord
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((f, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime + index * 0.06);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + index * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(ctx.currentTime + index * 0.06);
        osc.stop(ctx.currentTime + index * 0.06 + 0.3);
      });
    }
  } catch (err) {
    console.warn("AudioContext block or error:", err);
  }
};

const PRACTICE_TEXTS = [
  "Урагшаа тэмүүл, зүгээр бүү суу. Бидний хүч чадал хамтын зорилгодоо оршдог.",
  "Эхлээд өөртөө итгэ, тэгвэл бусад хүмүүс чамд итгэх болно.",
  "Төгс төгөлдөр байдал гэдэг хэзээ ч зогсохгүй суралцах үйл явц юм.",
  "Алдаа гаргахаас бүү ай, харин алдаанаасаа суралцахгүй байхаас ай.",
  "Мөрөөдлийнхөө төлөө тэмцэж чадсан хүн л жинхэнэ ялагч болдог.",
  "Шинэ өглөө бүр чамд шинэ боломж, шинэ эхлэлийг авчирдаг.",
  "Ирээдүйг таамаглах хамгийн сайн арга бол түүнийг өөрөө бүтээх явдал юм.",
  "Амжилтын нууц нь шантрахгүй урагшлах тэвчээр, тууштай байдалд л оршдог.",
  "Сурах чиглэл хязгааргүй, мэдлэг бол хэзээ ч алдагдахгүй хамгийн том баялаг.",
  "Агуу зүйлс жижиг алхмаас эхэлдэг тул өнөөдөр л эхний алхмаа зоригтой хий."
];

export default function Typeracer({ onClose }: { onClose: () => void }) {
  // Navigation & Setup states
  const [screen, setScreen] = useState<"lobby" | "setup" | "room" | "playing">("lobby");
  const [playMode, setPlayMode] = useState<"solo" | "multi">("solo");
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("tr_player_name") || "");
  const [roomAction, setRoomAction] = useState<"create" | "join">("create");
  const [enteredRoomCode, setEnteredRoomCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Room identification
  const [roomId, setRoomId] = useState("");
  const [playerId] = useState(() => {
    let id = localStorage.getItem("tr_player_id");
    if (!id) {
      id = "user_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("tr_player_id", id);
    }
    return id;
  });

  // Multiplayer room synced state
  const [room, setRoom] = useState<RoomData | null>(null);

  // Active game typing states
  const [targetText, setTargetText] = useState("");
  const [typedText, setTypedText] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [countdownTime, setCountdownTime] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // Typing tracking
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  // Input ref
  const inputRef = useRef<HTMLInputElement>(null);

  // Local stats interval
  useEffect(() => {
    let interval: any;
    if (screen === "playing" && startTime !== null && !isFinished) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setSecondsElapsed(Math.round(elapsed));

        // Calculate WPM: (typed chars / 5) / (minutes elapsed)
        if (elapsed > 0.5) {
          const words = typedText.length / 5;
          const minutes = elapsed / 60;
          const currentWpm = Math.round(words / minutes);
          setWpm(currentWpm);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [screen, startTime, isFinished, typedText]);

  // Handle countdown transition for multiplayer
  useEffect(() => {
    let timer: any;
    if (countdownTime !== null && countdownTime > 0) {
      timer = setTimeout(() => {
        playSound("countdown");
        setCountdownTime((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdownTime === 0) {
      playSound("start");
      setCountdownTime(null);
      setScreen("playing");
      setStartTime(Date.now());
      setSecondsElapsed(0);
      setWpm(0);
      setAccuracy(100);
      setTypedText("");
      setIsFinished(false);
      setTimeout(() => inputRef.current?.focus(), 50);

      // In multiplayer, update status to playing
      if (playMode === "multi" && roomId) {
        updateDoc(doc(db, "typeracer_rooms", roomId), {
          status: "playing"
        }).catch((err) => console.error("Error updating status to playing:", err));
      }
    }
    return () => clearTimeout(timer);
  }, [countdownTime, playMode, roomId]);

  // Sync state to Firebase in multiplayer mode
  const lastSyncTimeRef = useRef<number>(0);
  useEffect(() => {
    if (playMode === "multi" && roomId && screen === "playing") {
      const now = Date.now();
      const progressPercent = Math.min(100, Math.round((typedText.length / targetText.length) * 100));
      
      // Throttle Firebase updates to max once every 200ms to avoid rate-limiting issues
      if (now - lastSyncTimeRef.current > 200 || isFinished) {
        lastSyncTimeRef.current = now;
        
        const updatePayload: any = {
          [`players.${playerId}.wpm`]: wpm,
          [`players.${playerId}.progress`]: progressPercent,
          [`players.${playerId}.accuracy`]: accuracy,
          [`players.${playerId}.finished`]: isFinished
        };

        if (isFinished) {
          updatePayload[`players.${playerId}.finishedAt`] = new Date().toISOString();
        }

        updateDoc(doc(db, "typeracer_rooms", roomId), updatePayload)
          .catch((err) => console.error("Error syncing stats:", err));
      }
    }
  }, [typedText, wpm, accuracy, isFinished, playMode, roomId, playerId, targetText]);

  // Check if everyone is finished in multiplayer to set room status to finished
  useEffect(() => {
    if (playMode === "multi" && room && room.status === "playing") {
      const playerList = Object.values(room.players) as PlayerState[];
      const allFinished = playerList.every((p) => p.finished);
      if (allFinished && playerList.length > 0) {
        updateDoc(doc(db, "typeracer_rooms", roomId), {
          status: "finished"
        }).catch((err) => console.error("Error setting room to finished:", err));
      }
    }
  }, [room, playMode, roomId]);

  // Setup Real-time Firestore subscription for multiplayer room
  useEffect(() => {
    if (playMode === "multi" && roomId) {
      const unsub = onSnapshot(doc(db, "typeracer_rooms", roomId), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as RoomData;
          setRoom(data);
          setTargetText(data.text);

          // Handle automatic transitions driven by status field
          if (data.status === "countdown" && screen === "room" && countdownTime === null) {
            setCountdownTime(5);
          }
          if (data.status === "playing" && screen === "room") {
            setScreen("playing");
            setStartTime(Date.now());
            setSecondsElapsed(0);
            setWpm(0);
            setAccuracy(100);
            setTypedText("");
            setIsFinished(false);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
          if (data.status === "finished" && screen === "playing") {
            setIsFinished(true);
          }
        } else {
          setErrorMessage("Өрөө олдсонгүй эсвэл устгагдсан байна.");
          setScreen("setup");
        }
      });
      return () => unsub();
    }
  }, [roomId, playMode]);

  // Handle single character/key input inside the Typing Area
  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished) return;

    const value = e.target.value;
    
    // Play subtle mechanical key sound
    if (value.length > typedText.length) {
      const addedChar = value[value.length - 1];
      const correctChar = targetText[value.length - 1];

      if (addedChar === correctChar) {
        playSound("click");
      } else {
        playSound("error");
      }
    }

    setTypedText(value);

    // Calculate real-time accuracy: percent of correct matches over typed length
    let correct = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === targetText[i]) {
        correct++;
      }
    }
    const currentAccuracy = value.length > 0 ? Math.round((correct / value.length) * 100) : 100;
    setAccuracy(currentAccuracy);

    // Check completion condition
    if (value === targetText) {
      playSound("finish");
      setIsFinished(true);
      
      // Calculate final exact stats
      const totalTime = (Date.now() - (startTime || Date.now())) / 1000;
      const finalMinutes = totalTime / 60;
      const finalWpm = Math.round((targetText.length / 5) / finalMinutes);
      setWpm(finalWpm);

      if (playMode === "solo") {
        setScreen("playing"); // stay on playing screen showing results
      }
    }
  };

  // Create a brand new room
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage("Нэрээ оруулна уу.");
      return;
    }
    localStorage.setItem("tr_player_name", playerName.trim());
    setErrorMessage("");

    try {
      // Generate a short 4-character room ID (uppercase)
      const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
      }

      const randomText = PRACTICE_TEXTS[Math.floor(Math.random() * PRACTICE_TEXTS.length)];
      const docRef = doc(db, "typeracer_rooms", code);

      await setDoc(docRef, {
        text: randomText,
        status: "waiting",
        createdAt: new Date().toISOString(),
        players: {
          [playerId]: {
            name: playerName.trim(),
            wpm: 0,
            progress: 0,
            accuracy: 100,
            finished: false,
            joinedAt: new Date().toISOString()
          }
        }
      });

      setRoomId(code);
      setRoom({
        text: randomText,
        status: "waiting",
        createdAt: new Date().toISOString(),
        players: {
          [playerId]: {
            name: playerName.trim(),
            wpm: 0,
            progress: 0,
            accuracy: 100,
            finished: false,
            joinedAt: new Date().toISOString()
          }
        }
      });
      setTargetText(randomText);
      setScreen("room");
      triggerSuccessToast("Өрөө амжилттай үүслээ! 🎉");
    } catch (err) {
      console.error("Error creating room:", err);
      setErrorMessage("Firestore-д өрөө үүсгэхэд алдаа гарлаа.");
    }
  };

  // Join an existing room via code
  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage("Нэрээ оруулна уу.");
      return;
    }
    if (!enteredRoomCode.trim()) {
      setErrorMessage("Өрөөний кодыг оруулна уу.");
      return;
    }
    localStorage.setItem("tr_player_name", playerName.trim());
    setErrorMessage("");

    const code = enteredRoomCode.trim().toUpperCase();

    try {
      const docRef = doc(db, "typeracer_rooms", code);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setErrorMessage("Уучлаарай, ийм кодтой өрөө олдсонгүй.");
        return;
      }

      const data = docSnap.data() as RoomData;
      if (data.status !== "waiting") {
        setErrorMessage("Энэ өрөөний тоглоом аль хэдийн эхэлсэн байна.");
        return;
      }

      // Add self to the players map
      await updateDoc(docRef, {
        [`players.${playerId}`]: {
          name: playerName.trim(),
          wpm: 0,
          progress: 0,
          accuracy: 100,
          finished: false,
          joinedAt: new Date().toISOString()
        }
      });

      setRoomId(code);
      setRoom(data);
      setTargetText(data.text);
      setScreen("room");
      triggerSuccessToast("Өрөөнд амжилттай нэгдлээ! 🏎️");
    } catch (err) {
      console.error("Error joining room:", err);
      setErrorMessage("Өрөөнд нэгдэхэд алдаа гарлаа. Кодоо дахин шалгана уу.");
    }
  };

  // Host triggers the game start (triggers 5s countdown)
  const handleStartCountdown = async () => {
    if (playMode !== "multi" || !roomId) return;
    try {
      await updateDoc(doc(db, "typeracer_rooms", roomId), {
        status: "countdown"
      });
    } catch (err) {
      console.error("Error starting countdown:", err);
    }
  };

  // Solo Mode Game Initiation
  const handleStartSolo = () => {
    const randomText = PRACTICE_TEXTS[Math.floor(Math.random() * PRACTICE_TEXTS.length)];
    setTargetText(randomText);
    setScreen("playing");
    setCountdownTime(3); // 3 seconds solo countdown
  };

  // Trigger UI toast notification
  const triggerSuccessToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 3500);
  };

  // Copy Room Code to clipboard
  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Reset or Back Actions
  const handleReset = () => {
    setScreen("lobby");
    setTypedText("");
    setStartTime(null);
    setSecondsElapsed(0);
    setWpm(0);
    setAccuracy(100);
    setIsFinished(false);
    setRoomId("");
    setRoom(null);
    setCountdownTime(null);
  };

  // Render text helper to display typed character states beautifully
  const renderTargetText = () => {
    return (
      <div className="text-sm sm:text-lg leading-relaxed font-normal tracking-wide text-gray-400 font-sans select-none bg-white/5 border border-white/5 p-4 sm:p-5 rounded-2xl relative">
        {targetText.split("").map((char, index) => {
          let charClass = "text-gray-400";
          let bgClass = "";

          if (index < typedText.length) {
            if (typedText[index] === char) {
              charClass = "text-emerald-400 font-semibold";
            } else {
              charClass = "text-red-500 font-bold underline decoration-red-600 decoration-2";
              bgClass = "bg-red-500/10";
            }
          } else if (index === typedText.length) {
            charClass = "text-purple-400 animate-pulse border-b-2 border-purple-400 font-semibold";
          }

          return (
            <span key={index} className={`${charClass} ${bgClass} transition-colors duration-150`}>
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  // Get list of players sorted by progress or finish rank
  const getSortedPlayers = () => {
    if (!room) return [];
    return Object.entries(room.players).map(([id, p]) => ({ id, ...(p as PlayerState) })).sort((a, b) => {
      if (a.finished && b.finished) {
        return (a.finishedAt || "") < (b.finishedAt || "") ? -1 : 1;
      }
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
  };

  // Determine if current player is host of the multiplayer room (first player joined)
  const isHost = () => {
    if (!room || !roomId) return false;
    const playerList = Object.entries(room.players).sort((a, b) => (a[1] as PlayerState).joinedAt.localeCompare((b[1] as PlayerState).joinedAt));
    return playerList.length > 0 && playerList[0][0] === playerId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in cursor-default">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl py-3 px-5 text-emerald-400 font-medium text-xs sm:text-sm flex items-center gap-2 shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 size={16} />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        id="typeracer-container"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] h-auto p-4 sm:p-6 rounded-2xl liquid-glass text-white shadow-2xl relative border border-white/10 flex flex-col justify-start gap-4 sm:gap-5 animate-blur-fade-up overflow-y-auto"
      >
        {/* CLOSE BUTTON */}
        <button
          id="btn-close-typeracer"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer active:scale-95"
          title="Хаах"
        >
          <X size={16} />
        </button>

        {/* HEADER SECTION */}
        <div className="flex items-center gap-2 pb-1 border-b border-white/5">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 shadow-lg shadow-purple-500/5">
            <Keyboard className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-2">
              TYPERACER CHALLENGE
              {playMode === "multi" && (
                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30 uppercase font-mono font-bold tracking-wider">
                  MULTIPLAYER
                </span>
              )}
            </h2>
            <p className="text-purple-400 text-[10px] tracking-widest uppercase font-mono font-semibold">
              Монгол хэл дээрх хурдан бичих тулаан
            </p>
          </div>
        </div>

        {/* SCREEN CONTENT CONTROL */}

        {/* SCREEN 1: LOBBY (SELECT SOLO / MULTIPLAYER) */}
        {screen === "lobby" && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8 space-y-6">
            <div className="text-center max-w-sm space-y-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">Тоглоомын горимоо сонгоно уу</h3>
              <p className="text-xs text-gray-400 font-light">
                Та ганцаараа дасгал хийх эсвэл найзуудтайгаа бодит цагт уралдах боломжтой.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
              <button
                onClick={() => {
                  setPlayMode("solo");
                  handleStartSolo();
                }}
                className="group p-5 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/35 hover:bg-purple-500/5 text-left transition-all cursor-pointer hover:scale-[1.02] duration-300"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Zap size={16} />
                  </div>
                  <span className="font-bold text-sm text-white font-sans group-hover:text-purple-400 transition-colors">Ганцаараа тоглох</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                  Хурдаа сорих дасгал хийж, WPM болон нарийвчлалаа хэмжээрэй.
                </p>
              </button>

              <button
                onClick={() => {
                  setPlayMode("multi");
                  setScreen("setup");
                }}
                className="group p-5 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/35 hover:bg-purple-500/5 text-left transition-all cursor-pointer hover:scale-[1.02] duration-300"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Users size={16} />
                  </div>
                  <span className="font-bold text-sm text-white font-sans group-hover:text-purple-400 transition-colors">Олон тоглогч</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                  Өрөө үүсгэж эсвэл кодоор нэгдэж, найзуудтайгаа бодит цагт уралдаарай.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: MULTIPLAYER SETUP */}
        {screen === "setup" && (
          <div className="flex-1 flex flex-col justify-center space-y-5 py-4">
            <button
              onClick={() => setScreen("lobby")}
              className="self-start text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Буцах</span>
            </button>

            <div className="max-w-md mx-auto w-full space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-white">Уралдаанд бэлтгэх</h3>
                <p className="text-xs text-gray-400 font-light">
                  Найзуудтайгаа холбогдохын тулд нэрээ оруулж, өрөө үүсгэх эсвэл нэгдэнэ үү.
                </p>
              </div>

              {/* Display Errors */}
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-3.5 bg-white/5 border border-white/5 p-4 rounded-xl">
                {/* Player Name input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Таны нэр</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Жишээ: Сайханбилэг..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-all font-light"
                  />
                </div>

                {/* Create or Join selection */}
                <div className="grid grid-cols-2 gap-2 pb-1">
                  <button
                    onClick={() => setRoomAction("create")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      roomAction === "create"
                        ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                        : "bg-transparent border-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    Өрөө үүсгэх
                  </button>
                  <button
                    onClick={() => setRoomAction("join")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      roomAction === "join"
                        ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                        : "bg-transparent border-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    Өрөөнд орох
                  </button>
                </div>

                {/* Conditional fields based on Action */}
                {roomAction === "create" ? (
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm shadow-lg shadow-purple-500/15"
                  >
                    <Play size={14} className="fill-white" />
                    <span>ШИНЭ ӨРӨӨ ҮҮСГЭХ</span>
                  </button>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Өрөөний код</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Жишээ: AB12..."
                        value={enteredRoomCode}
                        onChange={(e) => setEnteredRoomCode(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-all text-center font-mono font-bold uppercase tracking-widest"
                      />
                    </div>
                    <button
                      onClick={handleJoinRoom}
                      className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm shadow-lg shadow-purple-500/15"
                    >
                      <Users size={14} />
                      <span>ӨРӨӨНД НЭГДЭХ</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: MULTIPLAYER WAITING LOBBY (ROOM SCREEN) */}
        {screen === "room" && room && (
          <div className="flex-1 flex flex-col justify-start space-y-4 py-2">
            <button
              onClick={handleReset}
              className="self-start text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Өрөөнөөс гарах</span>
            </button>

            {/* Room Code Showcase */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl gap-3">
              <div className="space-y-0.5 text-center sm:text-left">
                <h4 className="text-xs font-bold text-purple-400">Найзуудыг урих код:</h4>
                <p className="text-xs text-gray-400 font-light">
                  Доорх кодыг найздаа илгээн, уралдаанд оролцуулаарай.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-lg py-1.5 px-3 font-mono">
                <span className="text-sm font-black text-white tracking-widest uppercase">{roomId}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-colors cursor-pointer active:scale-90"
                  title="Хуулах"
                >
                  {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Waiting Players List */}
            <div className="space-y-2 flex-1">
              <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Оролцогчид ({Object.keys(room.players).length}):
              </h4>

              <div className="space-y-2">
                {Object.entries(room.players).map(([id, player], index) => {
                  const isPlayerSelf = id === playerId;
                  const p = player as PlayerState;
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-purple-400 font-bold bg-purple-500/10 w-6 h-6 rounded-md flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-white">
                          {p.name} {isPlayerSelf && <span className="text-[10px] text-purple-400">(Та)</span>}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        <span>Нэгдсэн</span>
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2">
              {isHost() ? (
                <button
                  onClick={handleStartCountdown}
                  className="w-full py-3 bg-purple-500 hover:bg-purple-600 active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-500/20"
                >
                  <Play size={16} className="fill-white" />
                  <span>УРАЛДААНЫГ ЭХЛЭХ</span>
                </button>
              ) : (
                <div className="w-full py-3 bg-white/5 border border-white/5 rounded-xl text-center text-xs text-gray-400 font-light flex items-center justify-center gap-2 animate-pulse">
                  <span>Түүнчлэн зохион байгуулагч уралдааныг эхлүүлэхийг хүлээж байна...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 4: ACTIVE TYPING GAMEPLAY (PLAYING STATE) */}
        {screen === "playing" && (
          <div className="flex-1 flex flex-col justify-start space-y-4 py-1">
            
            {/* Countdown Overlay overlay */}
            {countdownTime !== null && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
                <motion.div
                  key={countdownTime}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  className="text-7xl font-black text-purple-400 font-mono"
                >
                  {countdownTime}
                </motion.div>
                <p className="text-xs text-gray-400 tracking-wider uppercase mt-3 font-semibold">Уралдаан эхлэхэд</p>
              </div>
            )}

            {/* Header game details (WPM / Time) */}
            <div className="flex items-center justify-between text-xs sm:text-sm bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-1 text-purple-400 font-bold">
                <Zap size={14} />
                <span>WPM: <strong className="text-white font-mono text-sm sm:text-base">{wpm}</strong></span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 size={14} />
                <span>Нарийвчлал: <strong className="text-white font-mono text-sm sm:text-base">{accuracy}%</strong></span>
              </div>
              <div className="flex items-center gap-1 text-cyan-400 font-bold">
                <Timer size={14} />
                <span>Хугацаа: <strong className="text-white font-mono text-sm sm:text-base">{secondsElapsed}s</strong></span>
              </div>
            </div>

            {/* REAL-TIME RACE TRACKS SHOWCASE (IN MULTIPLAYER MODE) */}
            {playMode === "multi" && room && (
              <div className="space-y-3 bg-black/20 border border-white/5 p-3.5 rounded-2xl">
                <h4 className="text-[9px] uppercase font-black text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Trophy size={11} className="text-yellow-500 animate-bounce" />
                  <span>Уралдааны зам (Бодит цагт):</span>
                </h4>

                <div className="space-y-3">
                  {getSortedPlayers().map((player, idx) => {
                    const isSelf = player.id === playerId;
                    return (
                      <div key={player.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-semibold ${isSelf ? "text-purple-400" : "text-gray-300"}`}>
                            {idx + 1}. {player.name} {isSelf && "(Та)"}
                          </span>
                          <span className="font-mono text-gray-400 text-[10px]">
                            {player.wpm} WPM • {player.progress}%
                          </span>
                        </div>

                        {/* Track bar */}
                        <div className="h-6 w-full bg-white/5 rounded-md relative overflow-hidden border border-white/5 flex items-center">
                          {/* Progress Line */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-purple-500/10 transition-all duration-300 border-r border-purple-500/20"
                            style={{ width: `${player.progress}%` }}
                          />

                          {/* Racing Emoji avatar */}
                          <motion.div
                            className="absolute text-sm"
                            animate={{ left: `calc(${player.progress}% - 14px)` }}
                            style={{ left: "0px" }}
                            transition={{ type: "spring", stiffness: 60, damping: 15 }}
                          >
                            🏎️
                          </motion.div>

                          {/* Finish Flag */}
                          <div className="absolute right-1 text-xs">
                            🏁
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DISPLAY TARGET TYPING WORDING */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Бичих текст:</h4>
              {renderTargetText()}
            </div>

            {/* INTERACTIVE TEXT FIELD */}
            <div className="space-y-2">
              <input
                ref={inputRef}
                type="text"
                disabled={isFinished || countdownTime !== null}
                value={typedText}
                onChange={handleTypingChange}
                placeholder={countdownTime !== null ? "Бэлдээрэй..." : "Энд бичиж эхэлнэ үү..."}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-light"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            {/* LOCAL SOLO COMPLETION MODAL WINDOW */}
            {isFinished && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 sm:p-5 text-center space-y-4 mt-2"
              >
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-purple-400 flex items-center justify-center gap-1.5">
                    <Trophy className="text-yellow-400 animate-bounce" size={18} />
                    УРАЛДААНЫГ ДУУСГАСАН БАЯР ХҮРГЭЕ!
                  </h3>
                  <p className="text-xs text-gray-300 font-light">
                    Та бичих дасгалыг маш амжилттай дуусгалаа. Таны бичих үзүүлэлт:
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-black/20 p-3 rounded-xl max-w-md mx-auto">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">WPM</p>
                    <p className="text-base sm:text-lg font-black text-white font-mono">{wpm}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Нарийвчлал</p>
                    <p className="text-base sm:text-lg font-black text-white font-mono">{accuracy}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Хугацаа</p>
                    <p className="text-base sm:text-lg font-black text-white font-mono">{secondsElapsed}s</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-center max-w-sm mx-auto">
                  <button
                    onClick={() => {
                      if (playMode === "solo") {
                        handleStartSolo();
                      } else {
                        handleReset();
                      }
                    }}
                    className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={13} />
                    <span>ДАХИН ТОГЛОХ</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="py-2 px-4 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95"
                  >
                    Лобби руу буцах
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
