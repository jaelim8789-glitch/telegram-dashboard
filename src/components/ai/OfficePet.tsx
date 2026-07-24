"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Fish, Cookie, Gift } from "lucide-react";
import { cn } from "@/lib/cn";

const PET_NAMES = ["?�비", "초코", "몽이", "루키", "코코"];
const PET_EMOJIS = ["?��", "?��", "?��", "?��", "?��"];

interface PetData {
  name: string;
  emoji: string;
  level: number;
  exp: number;
  fed: number;
  petted: number;
  lastFed: string;
}

function loadPet(): PetData {
  if (typeof window === "undefined") return { name: "?�비", emoji: "?��", level: 1, exp: 0, fed: 0, petted: 0, lastFed: "" };
  try {
    const raw = localStorage.getItem("office_pet");
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Unhandled error in OfficePet', e) }
  const idx = Math.floor(Math.random() * PET_NAMES.length);
  return { name: PET_NAMES[idx]!, emoji: PET_EMOJIS[idx]!, level: 1, exp: 0, fed: 0, petted: 0, lastFed: "" };
}

const PET_MOODS: Record<string, { emoji: string; msg: string }> = {
  happy: { emoji: "?��", msg: "기분??좋아??" },
  hungry: { emoji: "?��", msg: "배고?�요..." },
  sleepy: { emoji: "?��", msg: "졸려??.." },
  love: { emoji: "?��", msg: "?�랑?�요! ?��" },
  play: { emoji: "?��", msg: "?�?�주?�요!" },
};

export function OfficePet() {
  const [pet, setPet] = useState<PetData>(loadPet);
  const [mood, setMood] = useState("happy");
  const [isSleeping, setIsSleeping] = useState(false);
  const [showAction, setShowAction] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Random movement
  useEffect(() => {
    const interval = setInterval(() => {
      setPos({ x: Math.random() * 80 + 10, y: Math.random() * 60 + 20 });
    }, 5000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, []);

  // Mood cycle
  useEffect(() => {
    const moods = ["happy", "hungry", "sleepy", "happy", "happy", "love"];
    const interval = setInterval(() => {
      setMood(moods[Math.floor(Math.random() * moods.length)]);
      const now = new Date().getHours();
      setIsSleeping(now >= 22 || now < 6);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const petAction = (action: string) => {
    setPet((prev) => {
      const next = { ...prev };
      if (action === "feed") {
        next.fed += 1;
        next.exp += 5;
        next.lastFed = new Date().toISOString();
        setShowAction("?���??�냠!");
      } else if (action === "pet") {
        next.petted += 1;
        next.exp += 3;
        setShowAction("?�� 간�???");
      }
      if (next.exp >= 50) {
        next.level += 1;
        next.exp = 0;
        setShowAction("?�� ?�벨??");
      }
      setMood("love");
      localStorage.setItem("office_pet", JSON.stringify(next));
      return next;
    });
    setTimeout(() => setShowAction(""), 2000);
  };

  const moodInfo = PET_MOODS[mood] || PET_MOODS.happy!;

  if (isSleeping) {
    return (
      <div className="rounded-2xl border border-app-border bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">?��</span>
          <div>
            <p className="text-xs font-semibold text-app-text">{pet.emoji} {pet.name} (Lv.{pet.level})</p>
            <p className="text-[9px] text-app-text-muted">?�� ?�자??�?.. (밤이?�서)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-app-border bg-gradient-to-br from-yellow-500/5 to-orange-500/5 p-3 relative overflow-hidden">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ y: [0, -3, 0], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="text-2xl cursor-pointer"
            onClick={() => petAction("pet")}
          >
            {pet.emoji}
          </motion.div>
          <div>
            <p className="text-xs font-semibold text-app-text">{pet.name} <span className="text-[9px] text-app-text-muted">Lv.{pet.level}</span></p>
            <p className="text-[9px] text-app-text-muted">{moodInfo.emoji} {moodInfo.msg}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 text-[8px] text-app-text-muted">
          <Heart className="h-2.5 w-2.5 text-red-400" /> {pet.petted}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <button onClick={() => petAction("feed")} className="flex items-center gap-1 rounded-lg bg-orange-500/10 px-2.5 py-1 text-[9px] text-orange-400 hover:bg-orange-500/20 transition-colors">
          <Fish className="h-3 w-3" /> 밥주�?        </button>
        <button onClick={() => petAction("pet")} className="flex items-center gap-1 rounded-lg bg-pink-500/10 px-2.5 py-1 text-[9px] text-pink-400 hover:bg-pink-500/20 transition-colors">
          <Heart className="h-3 w-3" /> ?�다?�기
        </button>
      </div>

      {/* Level bar */}
      <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all" style={{ width: `${(pet.exp / 50) * 100}%` }} />
      </div>

      {showAction && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="absolute top-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-[8px] text-white backdrop-blur-sm"
        >
          {showAction}
        </motion.div>
      )}
    </div>
  );
}
