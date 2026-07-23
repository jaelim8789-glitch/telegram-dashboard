"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";

export function useExpandWidget() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const expand = useCallback((id: string) => setExpanded(id), []);
  const collapse = useCallback(() => setExpanded(null), []);

  const ExpandToggle = ({ id, className }: { id: string; className?: string }) => (
    <button onClick={expanded === id ? collapse : () => expand(id)} className="text-app-text-muted hover:text-app-text active:scale-90 p-1" aria-label={expanded === id ? "축소" : "확대"}>
      {expanded === id ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
    </button>
  );

  return { expanded, expand, collapse, ExpandToggle };
}
