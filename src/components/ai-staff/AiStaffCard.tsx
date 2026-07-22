"use client";

import { motion } from "framer-motion";
import type { AiStaff } from "@/store/useStaffStore";

interface Props {
  staff: AiStaff;
  onClick: () => void;
}

export function AiStaffCard({ staff, onClick }: Props) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-2xl border border-app-border bg-app-card p-4 flex flex-col items-center gap-2 text-left transition-colors hover:border-app-border-strong hover:bg-app-card-hover active:scale-[0.99]"
      >
        <div className="w-16 h-16 rounded-full overflow-hidden bg-app-surface shrink-0">
          <img
            src={staff.avatar}
            alt={staff.name || staff.roleTitle}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-sm font-semibold text-app-text text-center">
          {staff.name || staff.roleTitle}
        </span>
        <span className="text-[11px] text-app-text-secondary text-center leading-tight">
          {staff.specialty}
        </span>
        <div className="w-full h-1.5 bg-app-border/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
            style={{ width: `${staff.expertise}%` }}
          />
        </div>
        <span className="text-[10px] text-amber-400 font-medium">{staff.expertise}%</span>
      </button>
    </motion.div>
  );
}
