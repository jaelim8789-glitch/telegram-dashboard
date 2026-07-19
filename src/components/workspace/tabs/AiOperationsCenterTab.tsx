"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  LayoutDashboard,
  Network,
  Server,
  Activity,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

interface McpTool {
  name: string;
  description: string;
  requires_approval?: boolean;
}

interface McpServer {
  server_id: string;
  title: string;
  enabled: boolean;
  tools: McpTool[];
}

interface Catalog {
  enabled: boolean;
  servers: McpServer[];
}

export function AiOperationsCenterTab() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toolResult, setToolResult] = useState<string>("");
  const [invoking, setInvoking] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mcp-gateway/catalog");
      if (res.ok) {
        setCatalog(await res.json());
      } else {
        setError("MCP Gateway 카탈로그를 불러오지 못했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const runReadonlyTool = async (server: McpServer, tool: McpTool) => {
    if (tool.requires_approval || invoking) return;
    setInvoking(true);
    setToolResult(`실행 중: ${server.server_id}.${tool.name}`);
    try {
      const res = await fetch("/api/mcp-gateway/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server_id: server.server_id,
          tool_name: tool.name,
          arguments: {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      setToolResult(JSON.stringify(data, null, 2));
    } catch {
      setToolResult("실행 실패: 네트워크 오류");
    } finally {
      setInvoking(false);
    }
  };

  const totalTools = catalog?.servers.reduce((n, s) => n + s.tools.length, 0) ?? 0;
  const enabledServers = catalog?.servers.filter(s => s.enabled).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-5 w-5 text-app-primary" />
        <h2 className="text-sm font-bold text-app-text">AI Operations Center</h2>
        <Sparkles className="h-3.5 w-3.5 text-app-warning" />
        <span className="text-[10px] text-app-text-muted">LangGraph · MCP Gateway</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-app-text-muted text-xs">
          <Loader2 className="h-4 w-4 animate-spin" /> MCP Gateway 상태 확인 중...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-app-danger text-xs">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      ) : (
        <>
          {/* Status overview */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Panel title="MCP Gateway">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-app-primary" />
                <span className="text-xs text-app-text">
                  {catalog?.enabled ? "활성화" : "비활성화"}
                </span>
              </div>
            </Panel>
            <Panel title="등록된 서버">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-app-info" />
                <span className="text-xs text-app-text">
                  {enabledServers}/{catalog?.servers.length ?? 0} 활성
                </span>
              </div>
            </Panel>
            <Panel title="노출 툴">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-app-success" />
                <span className="text-xs text-app-text">{totalTools}개</span>
              </div>
            </Panel>
          </div>

          {/* MCP servers */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {catalog?.servers.map(s => (
              <Panel
                key={s.server_id}
                title={
                  <div className="flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5" />
                    {s.title}
                    {s.enabled ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-app-success" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-app-text-subtle" />
                    )}
                  </div>
                }
              >
                <p className="text-[10px] text-app-text-muted mb-2">
                  {s.server_id} · {s.enabled ? "연결됨" : "설정 안 됨 (비활성)"}
                </p>
                <div className="space-y-1.5">
                  {s.tools.map(t => (
                    <div
                      key={t.name}
                      className={cn(
                        "rounded-lg border border-app-border bg-app-bg p-2",
                        t.requires_approval && "border-app-warning/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-[11px] font-medium text-app-primary">{t.name}</code>
                        {t.requires_approval && (
                          <span className="rounded-full bg-app-warning-muted px-1.5 py-0.5 text-[9px] text-app-warning">
                            승인 필요
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-app-text-muted mt-0.5 leading-snug">{t.description}</p>
                      {!t.requires_approval && s.enabled && (
                        <button
                          onClick={() => runReadonlyTool(s, t)}
                          disabled={invoking}
                          className="mt-1.5 text-[10px] text-app-info hover:underline disabled:opacity-50"
                        >
                          {invoking ? "실행 중..." : "실행"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>

          {toolResult && (
            <Panel title="툴 실행 결과">
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[10px] text-app-text">
                {toolResult}
              </pre>
            </Panel>
          )}

          <p className="text-[10px] text-app-text-muted">
            AI Operations Center는 LangGraph supervisor→worker 오케스트레이션과 MCP Gateway를
            통해 Telegram / Grafana 도구를 통합합니다. Phase 1 PoC: 카탈로그 탐색 및 읽기 전용
            툴 실행이 가능하며, 외부 상태 변경 툴은 승인 게이트로 보호됩니다.
          </p>
        </>
      )}
    </div>
  );
}
