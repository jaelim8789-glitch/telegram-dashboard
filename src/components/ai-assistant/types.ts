export interface SummaryItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SuggestedQuestion {
  id: string;
  text: string;
}
