"use client";

import { useState } from "react";

export type BillingPeriod = "monthly" | "quarterly";

export function PricingToggle({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (v: BillingPeriod) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-app-border bg-app-card p-0.5" data-fade>
      <button
        onClick={() => onChange("monthly")}
        className={`relative rounded-full px-5 py-2 text-xs font-medium transition-all duration-300 ${
          value === "monthly"
            ? "bg-app-primary text-app-bg shadow-sm"
            : "text-app-text-muted hover:text-app-text"
        }`}
      >
        월간
      </button>
      <button
        onClick={() => onChange("quarterly")}
        className={`relative rounded-full px-5 py-2 text-xs font-medium transition-all duration-300 ${
          value === "quarterly"
            ? "bg-app-primary text-app-bg shadow-sm"
            : "text-app-text-muted hover:text-app-text"
        }`}
      >
        분기
      </button>
    </div>
  );
}
