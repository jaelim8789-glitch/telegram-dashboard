import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useEffect } from "react";

const meta: Meta<typeof ToastProvider> = {
  title: "UI/Toast",
  component: ToastProvider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ToastProvider>;

function ToastDemo({ type, message, description }: { type: "success" | "error" | "warning" | "info" | "loading" | "critical"; message: string; description?: string }) {
  const { toast } = useToast();
  useEffect(() => {
    const t = setTimeout(() => toast(type, message, { description }), 100);
    return () => clearTimeout(t);
  }, [toast, type, message, description]);
  return <div className="p-8 text-center text-sm text-muted-foreground">Toast will appear momentarily...</div>;
}

export const Success: Story = {
  render: () => <ToastProvider><ToastDemo type="success" message="Operation completed" description="The operation was successful" /></ToastProvider>,
};

export const Error: Story = {
  render: () => <ToastProvider><ToastDemo type="error" message="Something went wrong" description="Please try again later" /></ToastProvider>,
};

export const Warning: Story = {
  render: () => <ToastProvider><ToastDemo type="warning" message="Proceed with caution" /></ToastProvider>,
};

export const Info: Story = {
  render: () => <ToastProvider><ToastDemo type="info" message="New update available" /></ToastProvider>,
};

export const Loading: Story = {
  render: () => <ToastProvider><ToastDemo type="loading" message="Processing..." /> </ToastProvider>,
};

export const Critical: Story = {
  render: () => <ToastProvider><ToastDemo type="critical" message="Critical error detected" description="Immediate attention required" /></ToastProvider>,
};
