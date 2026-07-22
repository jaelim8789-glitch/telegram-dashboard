"use client";

import { useState } from "react";
import { useStaffStore, type AiStaff } from "@/store/useStaffStore";
import { AiStaffCard } from "./AiStaffCard";
import { AiStaffEditor } from "./AiStaffEditor";
import { Plus } from "lucide-react";

interface Props {
  onChatWithStaff?: (staff: AiStaff) => void;
}

export function AiStaffPanel({ onChatWithStaff }: Props) {
  const { staffs } = useStaffStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-app-text">AI 스태프 ({staffs.length}명)</h2>
        <button
          className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-500 transition-colors"
          onClick={() => setShowNew(true)}
        >
          <Plus className="h-3 w-3" />새 직원
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {staffs.map((staff) => (
          <AiStaffCard
            key={staff.id}
            staff={staff}
            onClick={() => setEditingId(staff.id)}
          />
        ))}
      </div>

      {(editingId || showNew) && (
        <AiStaffEditor
          staffId={editingId}
          onClose={() => {
            setEditingId(null);
            setShowNew(false);
          }}
          onChatWithStaff={onChatWithStaff}
        />
      )}
    </div>
  );
}
