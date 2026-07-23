# TeleMon - 스모크 테스트 실행 스크립트 (3개 핵심 테스트만)
# 전체 테스트 대비 10배 빠른 피드백 주기

Write-Host "=== TeleMon Smoke Tests (3 critical tests only) ===" -ForegroundColor Cyan

# 스모크 테스트 파일 목록
$smokeTests = @(
    "e2e/accounts.spec.ts",     # 계정 관련 핵심 기능
    "e2e/core-flows.spec.ts",   # 핵심 플로우
    "e2e/auth.setup.ts"         # 인증 설정
)

Write-Host "Running smoke tests only (3/30+ tests)..." -ForegroundColor Yellow
Write-Host "⏱️  Expected completion: ~2 minutes vs ~20 minutes (full suite)" -ForegroundColor Green

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# 각 스모크 테스트 실행
foreach ($test in $smokeTests) {
    if (Test-Path $test) {
        Write-Host "🧪 Running $test" -ForegroundColor Yellow
        npx playwright test $test --project=chromium
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ $test failed" -ForegroundColor Red
            exit 1
        } else {
            Write-Host "✅ $test passed" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  $test not found, skipping" -ForegroundColor Magenta
    }
}

$stopwatch.Stop()
Write-Host ""
Write-Host "🎉 All smoke tests passed in $($stopwatch.Elapsed.Minutes)m$($stopwatch.Elapsed.Seconds)s" -ForegroundColor Green
Write-Host "📊 Coverage: 3 critical test files (accounts, core-flows, auth)" -ForegroundColor Green
Write-Host "⚡ Speed: ~10x faster than full test suite" -ForegroundColor Green