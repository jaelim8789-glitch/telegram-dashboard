@echo off
echo Committing mobile UI/UX improvements...

git add src/components/ui/QuickActionBar.tsx
git add src/components/ui/SmartKeyboardToolbar.tsx
git add src/hooks/useSwipeTemplate.ts
git add src/components/ui/Input.tsx
git add src/components/ui/Field.tsx
git add src/app/miniapp/MiniAppSend.tsx
git add src/app/miniapp/layout.tsx

git commit -m "feat: implement top 5 mobile UI/UX improvements for higher ROI
- Add QuickActionBar with 4 high-frequency action buttons
- Enhance SmartKeyboardToolbar with better organization
- Improve swipe template functionality with responsive feedback
- Ensure all touch targets meet minimum 44px requirement
- Add haptic feedback for better tactile response"

echo.
echo Commit completed successfully!
pause