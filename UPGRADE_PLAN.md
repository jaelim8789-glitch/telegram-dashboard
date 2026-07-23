# Selective Reconciliation: Account Registration Flow Upgrade

## Context
- **Canonical repo**: telegram-dashboard (master @ f055a93)
- **Source commit**: dd1a1c0 (feature/recurring-broadcast)
- **Goal**: Selectively integrate registration flow improvements without duplicating existing Account Operations Center

## Semantic Duplication Findings
- **Account List Panel** (from dd1a1c0): DUPLICATIVE — Sidebar already provides superior account management with health filtering, polling, ConfirmDialog delete. Will NOT add.
- **Step Progress Indicator**: Master already has one (gradient style). Will enhance with completed-state checkmark icons.
- **RegisterInspector**: Master has basic list. dd1a1c0 version with icons/status/troubleshooting is an improvement.

## Improvements to Integrate
1. **Phone validation** with inline field errors (validatePhone, validateCode, validatePassword)
2. **OTP paste support** (handleCodePaste)
3. **Password visibility toggle** (Eye/EyeOff)
4. **Toast notifications** for success/error/info
5. **Resend cooldown timer** (30s countdown)
6. **Duplicate submission prevention** (submitting guard on all handlers)
7. **Auto-focus** on code/password inputs via forwardRef
8. **Styled error banners** (motion-animated with XCircle icon)
9. **Phone formatting display** in code step
10. **2FA info banner** (warning-styled explanation)
11. **Success state enhancements** (dashboard navigation button, formatted phone)
12. **forwardRef on Input** (Field.tsx) — safe, backward-compatible
13. **RegisterInspector upgrade** — icons, status badges, troubleshooting panel

## Files to Change
- `src/components/workspace/tabs/AccountRegisterTab.tsx` — Major upgrade
- `src/components/inspector/RegisterInspector.tsx` — Upgrade with icons/troubleshooting
- `src/components/ui/Field.tsx` — Add forwardRef to Input