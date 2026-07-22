/**
 * No-Code Trigger/Action System API Client
 *
 * 트리거 → 조건 → 액션 워크플로우를 관리합니다.
 */

import { request } from "@/lib/api";

export interface TriggerDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
  params: { key: string; label: string; type: string }[];
}

export interface ActionDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
  params: { key: string; label: string; type: string }[];
}

export interface TriggerRule {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  actions: Record<string, unknown>[];
  cooldown_seconds: number;
  run_count: number;
  created_at: string;
}

export interface TriggerStats {
  total_rules: number;
  active_rules: number;
}

/** 트리거 정의 목록 조회 */
export async function fetchTriggerDefs(): Promise<TriggerDef[]> {
  const res = await request<{ triggers: TriggerDef[] }>("/api/triggers/definitions/triggers");
  return res.triggers;
}

/** 액션 정의 목록 조회 */
export async function fetchActionDefs(): Promise<ActionDef[]> {
  const res = await request<{ actions: ActionDef[] }>("/api/triggers/definitions/actions");
  return res.actions;
}

/** 규칙 목록 조회 */
export async function fetchRules(): Promise<TriggerRule[]> {
  const res = await request<{ rules: TriggerRule[] }>("/api/triggers");
  return res.rules;
}

/** 규칙 생성 */
export async function createRule(body: {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: Record<string, unknown>;
  actions: Record<string, unknown>[];
  is_active?: boolean;
}): Promise<{ id: string }> {
  return request("/api/triggers", { method: "POST", body: JSON.stringify(body) });
}

/** 규칙 조회 */
export async function fetchRule(id: string): Promise<TriggerRule> {
  return request<TriggerRule>(`/api/triggers/${id}`);
}

/** 규칙 수정 */
export async function updateRule(id: string, body: Partial<TriggerRule>): Promise<void> {
  await request(`/api/triggers/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

/** 규칙 삭제 */
export async function deleteRule(id: string): Promise<void> {
  await request(`/api/triggers/${id}`, { method: "DELETE" });
}

/** 규칙 활성/비활성 토글 */
export async function toggleRule(id: string): Promise<{ is_active: boolean }> {
  return request(`/api/triggers/${id}/toggle`, { method: "POST" });
}

/** 통계 조회 */
export async function fetchTriggerStats(): Promise<TriggerStats> {
  return request<TriggerStats>("/api/triggers/stats/summary");
}
