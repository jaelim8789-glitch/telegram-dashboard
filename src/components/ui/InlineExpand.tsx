"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";

export function InlineExpand({ open, children, duration = 0.2 }: { open: boolean; children: ReactNode; duration?: number }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
      transition={{ duration }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}
