"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" styles the confirm button as destructive (delete/revoke actions). */
  variant?: "default" | "danger";
  /** Called on confirm. May return a Promise — while it's pending, the dialog
   * shows a loading state on the confirm button and blocks Escape/backdrop/
   * cancel dismissal so the in-flight action can't be abandoned mid-request. */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Replaces window.confirm()-style flows with a themed, accessible dialog.
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <ConfirmDialog
 *     open={open}
 *     title="계정을 삭제할까요?"
 *     variant="danger"
 *     onConfirm={async () => { await deleteAccount(id); setOpen(false); }}
 *     onCancel={() => setOpen(false)}
 *   />
 * `onConfirm` is responsible for closing the dialog on success (so failed
 * confirms can stay open and show an error instead).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    if (pending) return;
    const result = onConfirm();
    if (result && typeof (result as Promise<void>).then === "function") {
      setPending(true);
      try {
        await result;
      } finally {
        setPending(false);
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      preventClose={pending}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
