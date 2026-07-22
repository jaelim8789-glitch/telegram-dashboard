"use client";

import type { SuggestedQuestion } from "./types";
import { Sparkles } from "lucide-react";

interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[];
  onSelect: (text: string) => void;
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20">
        <Sparkles className="h-8 w-8 text-violet-400" />
      </div>
      <p className="text-sm font-medium text-app-text">무엇을 도와드릴까요?</p>
      <div className="flex flex-wrap justify-center gap-2">
        {questions.map((q) => (
          <button
            key={q.id}
            onClick={() => onSelect(q.text)}
            className="rounded-full border border-violet-500/30 bg-violet-500/5 px-4 py-2 text-xs text-app-text transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-400"
          >
            {q.text}
          </button>
        ))}
      </div>
    </div>
  );
}
