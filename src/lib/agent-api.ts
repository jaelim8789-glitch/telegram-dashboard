import { request } from "@/lib/api";

export interface Agent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[];
  isTemplate: boolean;
  templatePrice: number;
  totalMessages: number;
  level: number;
  exp: number;
  createdAt: string;
}

export interface AgentChat {
  id: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "agent" | "tool";
  content: string;
  toolName?: string;
  toolButtonLabel?: string;
  toolPayload?: Record<string, unknown>;
  tokensUsed: number;
  createdAt: string;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  systemPrompt: string;
}

interface ApiAgent {
  id: string;
  name: string;
  role: string;
  system_prompt: string;
  tools: string[];
  is_template: boolean;
  template_price: number;
  total_messages: number;
  level: number;
  exp: number;
  created_at: string;
}

interface ApiAgentChat {
  id: string;
  agent_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ApiAgentMessage {
  id: string;
  role: string;
  content: string;
  tool_name?: string;
  tool_button_label?: string;
  tool_payload?: Record<string, unknown>;
  tokens_used: number;
  created_at: string;
}

function toAgent(a: ApiAgent): Agent {
  return {
    id: a.id,
    name: a.name,
    role: a.role,
    systemPrompt: a.system_prompt,
    tools: a.tools,
    isTemplate: a.is_template,
    templatePrice: a.template_price,
    totalMessages: a.total_messages,
    level: a.level,
    exp: a.exp,
    createdAt: a.created_at,
  };
}

function toChat(c: ApiAgentChat): AgentChat {
  return { id: c.id, agentId: c.agent_id, title: c.title, createdAt: c.created_at, updatedAt: c.updated_at };
}

function toMessage(m: ApiAgentMessage): AgentMessage {
  return {
    id: m.id,
    role: m.role as AgentMessage["role"],
    content: m.content,
    toolName: m.tool_name,
    toolButtonLabel: m.tool_button_label,
    toolPayload: m.tool_payload,
    tokensUsed: m.tokens_used,
    createdAt: m.created_at,
  };
}

// ── Agents ──────────────────────────────────────────────────────────

export async function fetchAgents(): Promise<Agent[]> {
  const list = await request<ApiAgent[]>("/api/ai/agents");
  return list.map(toAgent);
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const a = await request<ApiAgent>("/api/ai/agents", {
    method: "POST",
    body: JSON.stringify({ name: input.name, role: input.role, system_prompt: input.systemPrompt }),
  });
  return toAgent(a);
}

export async function updateAgent(id: string, input: Partial<CreateAgentInput>): Promise<Agent> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.role !== undefined) body.role = input.role;
  if (input.systemPrompt !== undefined) body.system_prompt = input.systemPrompt;
  const a = await request<ApiAgent>(`/api/ai/agents/${id}`, { method: "PUT", body: JSON.stringify(body) });
  return toAgent(a);
}

export async function deleteAgent(id: string): Promise<void> {
  await request<void>(`/api/ai/agents/${id}`, { method: "DELETE" });
}

// ── Chats ────────────────────────────────────────────────────────────

export async function createChat(agentId: string, title?: string): Promise<AgentChat> {
  const body: Record<string, unknown> = {};
  if (title) body.title = title;
  const c = await request<ApiAgentChat>(`/api/ai/agents/${agentId}/chat`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return toChat(c);
}

export async function fetchChats(agentId: string): Promise<AgentChat[]> {
  const list = await request<ApiAgentChat[]>(`/api/ai/agents/${agentId}/chats`);
  return list.map(toChat);
}

export async function deleteChat(chatId: string): Promise<void> {
  await request<void>(`/api/ai/chats/${chatId}`, { method: "DELETE" });
}

// ── Messages ─────────────────────────────────────────────────────────

export async function fetchChatMessages(chatId: string): Promise<AgentMessage[]> {
  const list = await request<ApiAgentMessage[]>(`/api/ai/chats/${chatId}/messages`);
  return list.map(toMessage);
}

export async function sendChatMessage(
  chatId: string,
  content: string
): Promise<Response> {
  const token = localStorage.getItem("access_token") || "";
  const sessionToken = localStorage.getItem("session_token") || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (sessionToken) headers["X-Session-Token"] = sessionToken;

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return fetch(`${baseUrl}/api/ai/chats/${chatId}/message`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content }),
  });
}

// ── Tool execution ───────────────────────────────────────────────────

export async function executeToolAction(
  messageId: string,
  toolName: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  return request(`/api/ai/messages/${messageId}/execute`, {
    method: "POST",
    body: JSON.stringify({ tool_name: toolName, payload }),
  });
}

// ── Templates ────────────────────────────────────────────────────────

export async function publishAgentTemplate(agentId: string, price: number): Promise<void> {
  await request(`/api/ai/agents/${agentId}/publish`, {
    method: "POST",
    body: JSON.stringify({ price }),
  });
}

export async function fetchTemplates(): Promise<Agent[]> {
  const list = await request<ApiAgent[]>(`/api/ai/templates`);
  return list.map(toAgent);
}

export async function purchaseTemplate(templateId: string): Promise<Agent> {
  const a = await request<ApiAgent>(`/api/ai/templates/${templateId}/purchase`, { method: "POST" });
  return toAgent(a);
}
