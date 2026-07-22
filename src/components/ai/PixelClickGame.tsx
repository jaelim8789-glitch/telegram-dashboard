"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Timer, Target, Trophy, RefreshCw, X } from "lucide-react";

const EMOJIS = ["👩‍💻", "🧑‍💼", "👩‍🔬", "🧑‍💻", "👩‍🎨", "🧑‍💼", "🤖", "🦊", "🐱", "🐼"];

interface PopupChar {
  id: number;
  emoji: string;
  x: number;
  y: number;
  timestamp: number;
}

export function PixelClickGame({ onClose }: { onClose: () => void }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [chars, setChars] = useState<PopupChar[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    if (typeof window !== "undefined") return parseInt(localStorage.getItem("clickgame_best") || "0");
    return 0;
  });
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gameRef = useRef<number>(0);

  const spawnChar = useCallback(() => {
    const newChar: PopupChar = {
      id: Date.now() + Math.random(),
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: Math.random() * 85 + 5,
      y: Math.random() * 80 + 5,
      timestamp: Date.now(),
    };
    setChars((prev) => [...prev.slice(-8), newChar]);
  }, []);

  const handleClick = (id: number) => {
    setChars((prev) => prev.filter((c) => c.id !== id));
    setScore((s) => s + 1);
    setCombo((c) => c + 1);
  };

  const startGame = () => {
    setStarted(true);
    setGameOver(false);
    setScore(0);
    setTimeLeft(30);
    setCombo(0);
    setChars([]);
  };

  useEffect(() => {
    if (!started || gameOver) return;
    if (timeLeft <= 0) {
      setGameOver(true);
      if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem("clickgame_best", score.toString());
      }
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    const spawner = setInterval(spawnChar, Math.max(200, 800 - score * 5));
    return () => { clearInterval(timer); clearInterval(spawner); };
  }, [started, gameOver, timeLeft, spawnChar, score, bestScore]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-[420px] max-w-[90vw] rounded-2xl border border-app-border bg-app-card p-4 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 text-white/50">
          <X className="h-3.5 w-3.5" />
        </button>

        {!started ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Trophy className="h-12 w-12 text-yellow-400" />
            <h3 className="text-lg font-bold text-white">🎯 직원 클릭 러시</h3>
            <p className="text-xs text-white/60 text-center max-w-xs">
              30초 동안 나타나는 직원들을 최대한 많이 클릭하세요!<br />
              콤보가 높을수록 더 빨리 나타납니다!
            </p>
            {bestScore > 0 && <p className="text-sm text-yellow-400">🏆 최고 기록: {bestScore}점</p>}
            <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">
              🎮 게임 시작!
            </button>
          </div>
        ) : gameOver ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} className="text-5xl">🎉</motion.div>
            <h3 className="text-lg font-bold text-white">게임 종료!</h3>
            <p className="text-4xl font-bold text-yellow-400">{score}점</p>
            {score >= bestScore && <p className="text-sm text-green-400">🎊 신기록!</p>}
            <div className="flex gap-2">
              <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-2 text-xs font-bold text-white">
                다시 도전
              </button>
              <button onClick={onClose} className="rounded-xl border border-white/20 px-5 py-2 text-xs text-white/60 hover:text-white">
                닫기
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* HUD */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-white/60" />
                <span className={`text-lg font-bold font-mono ${timeLeft <= 10 ? "text-red-400" : "text-white"}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-lg font-bold text-yellow-400">{score}</span>
                {combo > 2 && (
                  <motion.span key={combo} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-xs font-bold text-orange-400"
                  >🔥 x{combo}</motion.span>
                )}
              </div>
              <button onClick={onClose} className="text-[10px] text-white/30 hover:text-white/60">✕</button>
            </div>

            {/* Game area */}
            <div className="relative h-[300px] rounded-xl bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] overflow-hidden">
              {/* Grid dots */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={`grid-v-${i}`} className="absolute h-full w-px bg-white/5" style={{ left: `${(i / 20) * 100}%` }} />
              ))}
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={`grid-h-${i}`} className="absolute w-full h-px bg-white/5" style={{ top: `${(i / 20) * 100}%` }} />
              ))}

              <AnimatePresence>
                {chars.map((c) => (
                  <motion.button
                    key={c.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500 }}
                    className="absolute z-10 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/20 shadow-lg hover:scale-110 transition-transform"
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    onClick={() => handleClick(c.id)}
                  >
                    <span className="text-2xl">{c.emoji}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            <p className="mt-2 text-center text-[10px] text-white/30">
              💡 나타나는 직원들을 클릭하세요! 빠를수록 높은 점수!
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
