"use client";

import { create } from "zustand";

export type CategoryId =
  | "dashboard"
  | "nicegram"
  | "send"
  | "macro"
  | "analytics"
  | "settings";

interface CategoryMeta {
  id: CategoryId;
  label: string;
  tooltip: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "dashboard", label: "대시보드", tooltip: "대시보드" },
  { id: "nicegram", label: "나이스그램", tooltip: "나이스그램 채팅" },
  { id: "send", label: "발송", tooltip: "메시지 발송" },
  { id: "macro", label: "매크로", tooltip: "자동화 매크로" },
  { id: "analytics", label: "분석", tooltip: "데이터 분석" },
  { id: "settings", label: "설정", tooltip: "시스템 설정" },
];

interface CategoryStore {
  activeCategory: CategoryId;
  setCategory: (id: CategoryId) => void;
}

export const useCategoryStore = create<CategoryStore>((set) => ({
  activeCategory: "dashboard",
  setCategory: (id) => set({ activeCategory: id }),
}));