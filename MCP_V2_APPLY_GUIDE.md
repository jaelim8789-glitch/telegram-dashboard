# v2 MCP 설정 — 적용 · 검증 · 롤백 절차서

> 생성 일시: 2026-07-19
> 대상 환경: Windows 10/11 (PowerShell 5.1)
> 적용 범위: Claude Code, Cline, Kiro, TeleMon/AICompanyV2/Graphiti 프로젝트

## 0. 생성된 파일 목록

| 파일 | 용도 |
|------|------|
| `C:\Users\UserC\.claude\mcp.v2.json` | Claude Code v2 정리본 (기존 `mcp.json` 교체용, 백업 후 적용) |
| `C:\Users\UserC\.cline\mcp_settings.json` | Cline v2 MCP 설정 (신규) |
| `C:\Users\UserC\.kiro\settings\mcp.json` | Kiro v2 MCP 설정 (신규, 디렉터리 생성 포함) |
| `C:\Backups\emergency-20260718-211528\Dev\TeleMon\.mcp.json` | TeleMon 프로젝트 MCP |
| `C:\Backups\emergency-20260718-211528\Projects\AICompanyV2\.mcp.json` | AICompanyV2 프로젝트 MCP |
| `C:\Dev\graphiti\.mcp.json` | Graphiti 프로젝트 MCP |

> 실제 환경 기준 사실: 기존 활성 MCP는 Claude Code 1곳(11개 서버)뿐. Cline/Kiro/Kilo는
> 현재 MCP가 0개. `graphiti`는 로컬 서버(127.0.0.1:8001)가 실제 가동 중, `qdrant`는
> `C:\Users\UserC\.claude\mcp-venvs\qdrant` venv에 설치됨(확인 완료).

---

## 1. 사전 검증 (적용 전)

```powershell
# graphiti 로컬 서버 기동 확인
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | Where-Object State -eq Listen

# qdrant 서버 바이너리 존재 확인
Test-Path "C:\Users\UserC\.claude\mcp-venvs\qdrant\Scripts\mcp-server-qdrant.exe"

# git MCP 바이너리 존재 확인
Test-Path "C:\Users\UserC\AppData\Roaming\Python\Python313\Scripts\mcp-server-git.exe"

# npx 사용 가능 확인 (context7/playwright/filesystem 등)
npx --version
```

위 중 `graphiti` Listen 세션이 없으면 해당 서버를 먼저 띄워야 함 (v2 적용과 무관하게 선결 조건).

---

## 2. 적용 절차

### 2.1 Claude Code
기존 설정을 백업하고 v2 정리본으로 교체:

```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item "C:\Users\UserC\.claude\mcp.json" "C:\Users\UserC\.claude\mcp.json.bak-$ts"
Copy-Item "C:\Users\UserC\.claude\mcp.v2.json" "C:\Users\UserC\.claude\mcp.json" -Force
```
Claude Code 재시작 후 `/mcp` 로 서버 목록 확인.

### 2.2 Cline
파일은 이미 `C:\Users\UserC\.cline\mcp_settings.json` 에 생성됨.
Cline(VS Code 확장) 재시작 → MCP 패널에서 서버 연결 상태 확인.

### 2.3 Kiro
파일은 이미 `C:\Users\UserC\.kiro\settings\mcp.json` 에 생성됨.
Kiro가 미설치 상태라면 먼저 Kiro를 설치해야 로드됨. 설치 후 재시작.

### 2.4 프로젝트 (.mcp.json)
파일은 각 프로젝트 루트에 생성됨.
해당 프로젝트를 에이전트 워크스페이스로 열고 재로드.

---

## 3. 적용 후 검증

```powershell
# JSON 문법 유효성 검사 (전체)
$paths = @(
  "C:\Users\UserC\.claude\mcp.json",
  "C:\Users\UserC\.cline\mcp_settings.json",
  "C:\Users\UserC\.kiro\settings\mcp.json",
  "C:\Backups\emergency-20260718-211528\Dev\TeleMon\.mcp.json",
  "C:\Backups\emergency-20260718-211528\Projects\AICompanyV2\.mcp.json",
  "C:\Dev\graphiti\.mcp.json"
)
foreach ($p in $paths) {
  try { Get-Content $p -Raw | ConvertFrom-Json | Out-Null; "$p : OK" }
  catch { "$p : INVALID JSON" }
}
```

에이전트별 `/mcp`(Claude) 또는 동등 UI에서 각 서버 `connected` 상태 확인.
`graphiti`/`qdrant`는 로컬 서버 의존이므로 네트워크/포트 상태와 함께 점검.

---

## 4. 롤백 절차

### 4.1 Claude Code
```powershell
$bak = Get-ChildItem "C:\Users\UserC\.claude\mcp.json.bak-*" | Sort-Object Name | Select-Object -Last 1
Copy-Item $bak.FullName "C:\Users\UserC\.claude\mcp.json" -Force
Remove-Item "C:\Users\UserC\.claude\mcp.v2.json" -Force
```

### 4.2 Cline
```powershell
Remove-Item "C:\Users\UserC\.cline\mcp_settings.json" -Force
```

### 4.3 Kiro
```powershell
Remove-Item "C:\Users\UserC\.kiro\settings\mcp.json" -Force
# 디렉터리까지 제거하려면: Remove-Item "C:\Users\UserC\.kiro" -Recurse -Force
```

### 4.4 프로젝트
```powershell
Remove-Item "C:\Backups\emergency-20260718-211528\Dev\TeleMon\.mcp.json" -Force
Remove-Item "C:\Backups\emergency-20260718-211528\Projects\AICompanyV2\.mcp.json" -Force
Remove-Item "C:\Dev\graphiti\.mcp.json" -Force
```

롤백 후 각 에이전트 재시작.

---

## 5. 마이그레이션 위험 / 주의사항

1. **graphiti 의존성**: `127.0.0.1:8001` 로컬 서버에 종속. VPS/타 머신 이식 시 서버 기동 없으면
   즉시 동작 안 함. v2 설계에 "원격 graphiti 엔드포인트"가 없다면 이식 불가.
2. **qdrant 경로 하드코딩**: Claude venv 경로에 의존. Cline/Kiro에서 동일 바이너리 재사용(공유)함 —
   venv 삭제 시 3개 agent 모두 붕괴.
3. **Kiro 미설치**: `mcp.json`만 있어도 Kiro 자체가 없으면 로드 안 됨. 설치 선행 필요.
4. **Cline 포맷 차이**: Claude는 `"type":"streamableHttp"`, Cline은 `"type":"streamable-http"`,
   Kiro는 `"transport":"http"`. 각 agent 스키마를 그대로 따름(변환 필요).
5. **기존 Claude `mcp.json` 파괴 방지**: `mcp.v2.json`으로 분리 생성 후 수동 교체 권장(절차 2.1).

---

## 6. 검증 체크리스트

- [ ] 사전 검증 1항목 모두 통과
- [ ] Claude `/mcp` 11개 서버 connected
- [ ] Cline MCP 패널 11개 서버 connected
- [ ] Kiro 설치 후 11개 서버 connected (또는 Kiro 미설치 사유 기록)
- [ ] TeleMon/.mcp.json 7개 서버 loaded
- [ ] AICompanyV2/.mcp.json 6개 서버 loaded
- [ ] Graphiti/.mcp.json 5개 서버 loaded
- [ ] JSON 유효성 검사 모두 OK
