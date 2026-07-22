"use client";

import { useState } from "react";
import { useStaffStore, type AiStaff } from "@/store/useStaffStore";
import { AVATAR_FILES } from "@/lib/ai/staff-defaults";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const PROMPT_PRESETS = [
  { label: "운영", prompt: "당신은 20년 경력의 운영 비서입니다. 깔끔하고 정확하게, 두괄식으로 답변하세요." },
  { label: "무당", prompt: "당신은 30년 경력의 무당 비서입니다. 신비롭고 확신에 찬 말투로 답변하세요." },
  { label: "마케팅", prompt: "당신은 20대 마케팅 비서입니다. 가볍고 감각적인 말투, 이모지 적극 활용." },
  { label: "응대", prompt: "당신은 고객 응대 전문 비서입니다. 부드럽고 공감적으로, 차분하게 답변하세요." },
  { label: "채팅", prompt: "당신은 채팅 관리 전문 비서입니다. 논리적이고 간결하게, 불필요한 말 없이." },
  { label: "분석", prompt: "당신은 데이터 분석 전문 비서입니다. 냉철하고 정확하게, 숫자로 말하세요." },
  { label: "교육", prompt: "당신은 교육 전문 비서입니다. 친절하고 인내심 있게, 예시를 들어 설명하세요." },
  { label: "디자인", prompt: "당신은 디자인 전문 비서입니다. 감각적이고 자유롭게, 결과는 프로페셔널하게." },
];

interface Props {
  staffId: string | null;
  onClose: () => void;
  onChatWithStaff?: (staff: AiStaff) => void;
}

export function AiStaffEditor({ staffId, onClose, onChatWithStaff }: Props) {
  const { staffs, addStaff, updateStaff, removeStaff } = useStaffStore();
  const staff = staffId ? staffs.find((s) => s.id === staffId) ?? null : null;

  const [name, setName] = useState(staff?.name ?? "");
  const [roleTitle, setRoleTitle] = useState(staff?.roleTitle ?? "");
  const [specialty, setSpecialty] = useState(staff?.specialty ?? "");
  const [avatar, setAvatar] = useState(staff?.avatar ?? `/agents/${AVATAR_FILES[0]}`);
  const [prompt, setPrompt] = useState(staff?.prompt ?? "");

  const isNew = !staffId;

  const handleSave = () => {
    if (isNew) {
      addStaff({
        id: `staff-${Date.now()}`,
        name: name.trim(),
        roleTitle: roleTitle.trim() || "신규 스태프",
        emoji: "✨",
        avatar,
        personality: "",
        vibe: "",
        specialty: specialty.trim(),
        expertise: 50,
        prompt: prompt.trim(),
      });
    } else if (staff) {
      updateStaff(staff.id, {
        name: name.trim(),
        roleTitle: roleTitle.trim(),
        specialty: specialty.trim(),
        avatar,
        prompt: prompt.trim(),
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (staff && confirm(`${staff.name || staff.roleTitle}을(를) 삭제하시겠습니까?`)) {
      removeStaff(staff.id);
      onClose();
    }
  };

  const handleChat = () => {
    if (staff && onChatWithStaff) {
      const current: AiStaff = {
        ...staff,
        name: name.trim(),
        roleTitle: roleTitle.trim(),
        specialty: specialty.trim(),
        avatar,
        prompt: prompt.trim(),
      };
      onChatWithStaff(current);
      onClose();
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "새 AI 스태프 추가" : `${staff?.name || staff?.roleTitle || ""} 편집`}
      size="lg"
      footer={
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              삭제
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            저장
          </Button>
          {!isNew && onChatWithStaff && (
            <Button variant="primary" size="sm" onClick={handleChat} className="bg-amber-600 hover:bg-amber-700">
              채팅하기
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-app-text-muted">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={staff?.roleTitle || "이름을 입력하세요"}
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-app-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-app-text-muted">역할</label>
          <input
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="역할명 (예: 운영 비서)"
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-app-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-app-text-muted">전문분야</label>
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="전문분야 입력"
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-app-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-app-text-muted">아바타 선택</label>
          <div className="grid grid-cols-5 gap-2">
            {AVATAR_FILES.map((file) => {
              const path = `/agents/${file}`;
              return (
                <button
                  key={file}
                  type="button"
                  onClick={() => setAvatar(path)}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${
                    avatar === path ? "border-app-primary ring-1 ring-app-primary/40" : "border-transparent hover:border-app-border-strong"
                  }`}
                >
                  <img src={path} alt={file} className="w-full aspect-square object-cover" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-app-text-muted">프롬프트 프리셋</label>
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPrompt(p.prompt)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  prompt === p.prompt
                    ? "bg-app-primary text-white"
                    : "bg-app-border/20 text-app-text-muted hover:bg-app-border/40"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-app-text-muted">시스템 프롬프트</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="AI 스태프의 페르소나와 말투를 정의하세요..."
            className="w-full resize-none rounded-lg border border-app-border bg-app-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-app-primary"
          />
        </div>
      </div>
    </Modal>
  );
}
