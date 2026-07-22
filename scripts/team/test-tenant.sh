#!/usr/bin/env bash
# 테스트 전용 테넌트 고정 제공
# 실제 사용자 계정 대신 전용 테스트 계정을 사용하도록 보장
# 실행: scripts/team/use-test-tenant.sh
set -euo pipefail

echo "🧪 TeleMon 테스트 테넌트"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  규칙: 실제 사용자 계정으로 테스트 금지"
echo "   플랜 제한/Flood wait/차단 위험이 있습니다."
echo ""
echo "📋 사용 가능한 테스트 계정:"
echo "   - +820101234567 (테스트1) — 기본"
echo "   - +820101234568 (테스트2) — 대량발송 테스트용"
echo "   - +820101234569 (테스트3) — 에러 시나리오용"
echo ""
echo "🔧 설정:"
echo "   export TELEMON_TEST_MODE=true"
echo "   export NEXT_PUBLIC_API_BASE_URL=http://localhost:8000"
echo ""
echo "📄 발송 테스트 시:"
echo "   - 실제 그룹에 발송 금지"
echo "   - test_group_* 이름의 테스트 그룹만 사용"
echo "   - 하루 최대 50건 제한"
echo ""
echo "✅ 테스트 모드 활성화:"
echo "   echo 'TELEMON_TEST_MODE=true' >> .env.local"
