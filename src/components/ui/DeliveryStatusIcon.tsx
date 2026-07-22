"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export function DeliveryStatusIcon({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const s = size === "md" ? "h-4 w-4" : "h-3 w-3";
  if (status === "sent") return <CheckCircle2 className={`${s} text-emerald-500`} />;
  if (status === "failed") return <XCircle className={`${s} text-red-500`} />;
  return <Clock className={`${s} text-amber-500`} />;
}
