export interface WhisperTag {
  label: string;
  type: "info" | "warning" | "vip" | "language" | "urgent";
}

export interface WhisperData {
  customerId: string;
  customerName: string;
  tags: WhisperTag[];
  contextSummary: string;
  suggestedReply: string;
  confidence: number;
  lastContactAgo: string;
}

export interface WhisperRequestPayload {
  customerId: string;
  customerName: string;
  recentMessages: { role: string; content: string }[];
  metadata: {
    grade?: string;
    refundHistory?: number;
    preferredLanguage?: string;
    lastContactAgo?: string;
  };
}
