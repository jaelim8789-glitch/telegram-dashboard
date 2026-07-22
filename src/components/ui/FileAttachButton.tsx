"use client";

import { useState, useRef } from "react";
import { Plus, Image, File, X } from "lucide-react";

interface FileAttachment { id: string; name: string; type: "image" | "file"; size: number; dataUrl?: string; }

export function FileAttachButton({ onAttach }: { onAttach: (files: FileAttachment[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files || []);
    const newFiles: FileAttachment[] = fileList.map(f => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name, type: f.type.startsWith("image/") ? "image" : "file", size: f.size,
      dataUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));
    setAttachments(prev => [...prev, ...newFiles]);
    onAttach([...attachments, ...newFiles]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(id: string) {
    setAttachments(prev => { const next = prev.filter(f => f.id !== id); onAttach(next); return next; });
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*,application/pdf,text/plain" multiple className="hidden" onChange={handleFiles} />
      <button onClick={() => inputRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-lg border border-app-border text-app-text-muted hover:text-app-text hover:border-app-primary/30 active:scale-90 transition-all" aria-label="파일 첨부">
        <Plus className="h-4 w-4" />
      </button>
      {attachments.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px]" style={{ scrollbarWidth: "none" }}>
          {attachments.map(f => (
            <div key={f.id} className="flex shrink-0 items-center gap-1 rounded-lg border border-app-border bg-app-card-hover px-2 py-1">
              {f.type === "image" ? <Image className="h-3 w-3 text-app-primary" /> : <File className="h-3 w-3 text-app-text-muted" />}
              <span className="text-[10px] text-app-text truncate max-w-[60px]">{f.name}</span>
              <button onClick={() => removeFile(f.id)} className="text-app-text-muted hover:text-app-text"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
