import { observable } from '@legendapp/state';
import type { ConversationResponse } from '@/types/api';
import type { Message, StreamingMessage, ToolUse } from '@/types/conversation';

export interface PendingTool {
  id: string;
  tooluse: ToolUse;
}

export interface ConversationState {
  // The conversation data
  data: ConversationResponse;
  // Whether this conversation is currently generating
  isGenerating: boolean;
  // Whether this conversation has an active event stream
  isConnected: boolean;
  // Any pending tool
  pendingTool: PendingTool | null;
  // Last received message
  lastMessage?: Message;
}

// Central store for all conversations
export const conversations$ = observable(new Map<string, ConversationState>());

// Currently selected conversation
export const selectedConversation$ = observable<string | null>(null);

// Helper functions
export function updateConversation(id: string, update: Partial<ConversationState>) {
  const current = conversations$.get(id)?.get() || {
    data: { log: [], logfile: id, branches: {} },
    isGenerating: false,
    isConnected: false,
    pendingTool: null,
  };
  conversations$.get(id)?.set({ ...current, ...update });
}

export function addMessage(id: string, message: Message | StreamingMessage) {
  const conv = conversations$.get(id);
  if (conv) {
    conv.data.log.push(message);
  }
}

export function setGenerating(id: string, isGenerating: boolean) {
  updateConversation(id, { isGenerating });
}

export function setConnected(id: string, isConnected: boolean) {
  updateConversation(id, { isConnected });
}

export function setPendingTool(id: string, toolId: string | null, tooluse: ToolUse | null) {
  updateConversation(id, {
    pendingTool: toolId && tooluse ? { id: toolId, tooluse } : null,
  });
}

// Initialize a new conversation in the store
export function initConversation(id: string, data?: ConversationResponse) {
  const initial: ConversationState = {
    data: data || { log: [], logfile: id, branches: {} },
    isGenerating: false,
    isConnected: false,
    pendingTool: null,
  };
  const next = new Map(conversations$.get());
  next.set(id, initial);
  conversations$.set(next);
}
