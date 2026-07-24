#!/bin/bash
# pr-create: 현재 브랜치 → PR 자동 생성

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "master" ]; then
  echo "❌ On master branch. Switch to a feature branch first."
  exit 1
fi

echo "📝 Creating PR from $BRANCH → master..."

FILES=$(git diff --name-only origin/master..HEAD | head -20)

gh pr create --fill \
  --body "## 변경 파일

\`\`\`
$FILES
\`\`\`

## CI 확인
- [ ] pnpm run build 통과
- [ ] git log HEAD..origin/master 확인됨
- [ ] pnpm-lock.yaml 일치 (package.json 변경 시)

## 롤백 방법
\`\`\`bash
git revert HEAD --no-edit
git push origin master
\`\`\`"
