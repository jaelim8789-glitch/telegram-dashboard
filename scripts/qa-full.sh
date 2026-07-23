#!/usr/bin/env bash
# Run all three verification steps and report summary
set +e
echo "╔══════════════════════════════════╗"
echo "║     TeleMon Verify All          ║"
echo "╚══════════════════════════════════╝"
echo ""

echo "📦 [1/3] TypeScript..."
TSC_OUT=$(npx tsc --noEmit 2>&1)
TSC_EXIT=$?
if [ $TSC_EXIT -eq 0 ]; then
  echo "   ✅ PASS"
else
  ERROR_COUNT=$(echo "$TSC_OUT" | grep -c "error TS")
  echo "   ❌ FAIL ($ERROR_COUNT errors)"
fi

echo ""
echo "🔍 [2/3] Lint..."
LINT_OUT=$(pnpm lint 2>&1)
LINT_EXIT=$?
if [ $LINT_EXIT -eq 0 ]; then
  echo "   ✅ PASS"
else
  echo "   ❌ FAIL"
fi

echo ""
echo "🏗️  [3/3] Build..."
BUILD_OUT=$(npm run build 2>&1)
BUILD_EXIT=$?
if echo "$BUILD_OUT" | grep -q "✓ Compiled successfully\|✓ Generating static"; then
  echo "   ✅ PASS"
else
  echo "   ❌ FAIL"
fi

echo ""
if [ $TSC_EXIT -eq 0 ] && [ $LINT_EXIT -eq 0 ] && echo "$BUILD_OUT" | grep -q "✓ Compiled successfully"; then
  echo "🎉 ALL PASSED — ready to deploy"
else
  echo "❌ Some checks failed — fix before deploying"
fi
