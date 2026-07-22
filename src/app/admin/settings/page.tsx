"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Settings2, Save, Check, Loader2, AlertTriangle,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/InlineError";
import { useToast } from "@/components/ui/Toast";
import * as api from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [watermarkValue, setWatermarkValue] = useState("");
  const [watermarkDesc, setWatermarkDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/settings/watermark`, { headers: api.authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setWatermarkValue(data.value || "");
        setWatermarkDesc(data.description || "");
      })
      .catch(() => setError("설정을 불러오는데 실패했습니다"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings/watermark`, {
        method: "PUT",
        headers: await api.authHeaders(),
        body: JSON.stringify({ value: watermarkValue }),
      });
      if (res.ok) {
        toast("success", "워터마크 문구가 저장되었습니다. 다음 발송부터 적용됩니다.");
      } else {
        const err = await res.json().catch(() => ({ detail: "저장 실패" }));
        setError(err.detail || "저장 실패");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-xs text-app-text-muted hover:text-app-text mb-6">
          <ArrowLeft className="h-3.5 w-3.5" />
          대시보드로
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-primary/10">
            <Settings2 className="h-5 w-5 text-app-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-app-text">시스템 설정</h1>
            <p className="text-xs text-app-text-muted">워터마크 광고 문구 관리</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-app-danger/30 bg-app-danger-muted/10 px-4 py-3 text-xs text-app-danger">
            <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
            {error}
          </div>
        )}

        <Panel title="📢 워터마크 광고 문구">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-xs text-app-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중...
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-app-text-muted leading-relaxed">
                {watermarkDesc}
              </p>

              <textarea
                value={watermarkValue}
                onChange={(e) => setWatermarkValue(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-xs text-app-text font-mono leading-relaxed outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary/30 resize-none"
                placeholder="워터마크로 표시할 문구를 입력하세요. 빈 문자열로 설정하면 광고가 비활성화됩니다."
              />

              <div className="flex items-center justify-between">
                <div className="text-[10px] text-app-text-muted">
                  {watermarkValue.length.toLocaleString()}자
                  {watermarkValue.trim() === "" && " · 광고 비활성화됨"}
                </div>
                <Button variant="primary" onClick={save} loading={saving} disabled={saving}>
                  <Save className="h-4 w-4" />
                  저장하기
                </Button>
              </div>

              {/* Preview */}
              {watermarkValue.trim() && (
                <div className="mt-4">
                  <p className="text-[10px] font-medium text-app-text-muted mb-1.5">미리보기 (무료 요금제 발송 시 하단에 추가됨):</p>
                  <div className="rounded-xl border border-app-border bg-app-card p-4 whitespace-pre-wrap text-xs text-app-text leading-relaxed">
                    발송 원본 메시지입니다.
                    {watermarkValue}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>

        <div className="mt-6 rounded-xl border border-app-border bg-app-card p-4">
          <p className="text-xs text-app-text-muted leading-relaxed">
            💡 이 설정은 모든 무료 요금제 사용자의 발송 메시지 하단에 자동 추가됩니다.
            빈 문자열로 설정하면 광고 없이 발송됩니다 (프로모션 기간·이벤트 등).
            수정 후 다음 발송부터 적용됩니다.
          </p>
        </div>
      </div>
    </AdminGuard>
  );
}
