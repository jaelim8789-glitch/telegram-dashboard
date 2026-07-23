/**
 * 충돌 예측 알림 — 동시 작업 감지
 * 
 * 실행: .kilo/hooks/pre-apply  또는 agent 시작 시
 * 
 * lock 파일을 `.kilo/worktrees/*/.lock`에 두고,
 * 같은 파일을 작업 중인 다른 세션이 있는지 확인.
 */
const fs = require("fs");
const path = require("path");

const WORKTREE_DIR = path.join(__dirname, "..", ".kilo", "worktrees");
const LOCK_FILE = path.join(WORKTREE_DIR, ".active-files.json");

function checkConflicts(files) {
  if (!fs.existsSync(LOCK_FILE)) return [];

  const active = JSON.parse(fs.readFileSync(LOCK_FILE, "utf-8"));
  const conflicts = [];

  for (const file of files) {
    for (const [session, sessionFiles] of Object.entries(active)) {
      if (sessionFiles.includes(file)) {
        conflicts.push({ file, session });
      }
    }
  }

  return conflicts;
}

function writeLock(files, sessionId) {
  let data = {};
  if (fs.existsSync(LOCK_FILE)) {
    data = JSON.parse(fs.readFileSync(LOCK_FILE, "utf-8"));
  }
  data[sessionId] = files;
  // Clean stale sessions (> 1 hour)
  // TODO: remove sessions older than 1h
  fs.writeFileSync(LOCK_FILE, JSON.stringify(data, null, 2));
}

module.exports = { checkConflicts, writeLock };
