/**
 * 배포 이력 타임라인 페이지
 *
 * Git 로그를 파싱하여 배포 이력을 시간순으로 표시합니다.
 * 데이터는 빌드 시점에 정적 생성되며, 최근 200개 커밋을 보여줍니다.
 */

import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowUpDown, CheckCircle2, XCircle, RefreshCw, GitCommitHorizontal } from "lucide-react";
import Link from "next/link";

interface CommitEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
  refs: string;
}

// 빌드 시점에 git log 실행 — ISR로 최신 상태 유지
async function getDeployHistory(): Promise<CommitEntry[]> {
  const { execSync } = await import("child_process");
  try {
    const raw = execSync(
      'git log --max-count=200 --format="%H|%an|%ai|%s|%D" --date=short',
      { encoding: "utf-8", timeout: 10000 }
    );
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line: string) => {
        const [hash, author, date, ...msgParts] = line.split("|");
        return {
          hash: hash.slice(0, 7),
          author: author || "unknown",
          date: date?.slice(0, 10) || "",
          message: msgParts.join("|"),
          refs: "",
        };
      });
  } catch {
    return [];
  }
}

// 날짜별 그룹핑
function groupByDate(entries: CommitEntry[]): Map<string, CommitEntry[]> {
  const groups = new Map<string, CommitEntry[]>();
  for (const entry of entries) {
    const existing = groups.get(entry.date) || [];
    existing.push(entry);
    groups.set(entry.date, existing);
  }
  return groups;
}

export default async function DeployHistoryPage() {
  const commits = await getDeployHistory();
  const grouped = groupByDate(commits);

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-app-text">
            <RefreshCw className="h-5 w-5 text-app-primary" />
            배포 이력
          </h1>
          <p className="mt-1 text-sm text-app-text-muted">
            최근 {commits.length}개 커밋 · 실시간 반영사항 추적
          </p>
        </div>
        <Link
          href="https://github.com/jaelim8789-glitch/telegram-dashboard/commits/master"
          target="_blank"
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-2 text-xs text-app-text-muted hover:text-app-text hover:border-app-primary/40 transition-colors"
        >
          <GitCommitHorizontal className="h-3.5 w-3.5" />
          GitHub에서 보기
        </Link>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-app-border bg-app-card p-3 text-center">
          <div className="text-2xl font-bold text-app-text">{commits.length}</div>
          <div className="text-[11px] text-app-text-muted mt-1">전체 커밋</div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3 text-center">
          <div className="text-2xl font-bold text-app-success">
            {commits.filter((c) => c.message.startsWith("fix") || c.message.startsWith("feat")).length}
          </div>
          <div className="text-[11px] text-app-text-muted mt-1">기능/수정</div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3 text-center">
          <div className="text-2xl font-bold text-app-primary">
            {grouped.size}
          </div>
          <div className="text-[11px] text-app-text-muted mt-1">배포일</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-app-border/50" />

        {Array.from(grouped.entries()).map(([date, dayCommits]) => (
          <div key={date} className="relative pl-12 pb-6">
            {/* Date marker */}
            <div className="absolute left-0 top-0 flex items-center">
              <div className="z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-app-border bg-app-card">
                <ArrowUpDown className="h-4 w-4 text-app-text-muted" />
              </div>
            </div>

            {/* Date label */}
            <div className="mb-2 text-xs font-semibold text-app-text-muted">
              {(() => {
                try {
                  return format(parseISO(date), "PPP (eee)", { locale: ko });
                } catch {
                  return date;
                }
              })()}
            </div>

            {/* Commits */}
            <div className="space-y-1.5">
              {dayCommits.map((commit) => {
                const isFix = commit.message.startsWith("fix");
                const isFeat = commit.message.startsWith("feat");
                const isChore = commit.message.startsWith("chore") || commit.message.startsWith("refactor");
                return (
                  <div
                    key={commit.hash}
                    className="flex items-start gap-3 rounded-xl border border-app-border/60 bg-app-card/50 px-3 py-2.5 hover:bg-app-card-hover transition-colors"
                  >
                    <span className="mt-0.5 shrink-0">
                      {isFix ? (
                        <CheckCircle2 className="h-4 w-4 text-app-success" />
                      ) : isFeat ? (
                        <RefreshCw className="h-4 w-4 text-app-primary" />
                      ) : (
                        <GitCommitHorizontal className="h-4 w-4 text-app-text-subtle" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-app-text truncate">{commit.message}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-app-text-subtle">
                        <code className="rounded bg-app-card-hover px-1 font-mono text-[10px]">{commit.hash}</code>
                        <span>{commit.author}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {commits.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-app-text-muted">
          <GitCommitHorizontal className="h-10 w-10" />
          <p className="text-sm">배포 이력을 불러올 수 없습니다</p>
          <p className="text-xs text-app-text-subtle">Git 저장소가 필요합니다</p>
        </div>
      )}
    </div>
  );
}
