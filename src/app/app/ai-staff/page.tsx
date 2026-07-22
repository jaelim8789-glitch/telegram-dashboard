"use client";

import { useRouter } from "next/navigation";
import type { AiStaff } from "@/store/useStaffStore";
import { AiStaffPanel } from "@/components/ai-staff/AiStaffPanel";

export default function AiStaffPage() {
  const router = useRouter();

  const handleChatWithStaff = (staff: AiStaff) => {
    router.push(`/app/chat?staff=${staff.id}`);
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-app-bg">
      <AiStaffPanel onChatWithStaff={handleChatWithStaff} />
    </div>
  );
}
