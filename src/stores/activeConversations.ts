import { observable } from '@legendapp/state';
import type { Message, ToolUse } from '@/types/conversation';
import type { ConversationResponse } from '@/types/api';

export interface ActiveConversation {
  id: string;
  isGenerating: boolean;
  pendingTool: { id: string; tooluse: ToolUse } | null;
  data?: ConversationResponse;
  lastMessage?: Message;
}

const MAX_ACTIVE_CONVERSATIONS = 3;

export const activeConversations$ = observable<Map<string, ActiveConversation>>(new Map());

export function activateConversation(id: string) {
  console.log('[activeConversations] Activating:', id);
  const current = activeConversations$.get();
  console.log('[activeConversations] Current state:', {
    active: Array.from(current.keys()),
    activating: id,
    size: current.size,
  });

  // Create new map starting with the current conversation
  const newConversations = new Map<string, ActiveConversation>();

  // First add the current conversation (will be most recent)
  newConversations.set(
    id,
    current.get(id) || {
      id,
      isGenerating: false,
      pendingTool: null,
    }
  );

  // Then add other existing conversations (preserving their order)
  for (const [existingId, conv] of current.entries()) {
    if (existingId !== id && newConversations.size < MAX_ACTIVE_CONVERSATIONS) {
      newConversations.set(existingId, conv);
    }
  }

  console.log('[activeConversations] New state:', {
    active: Array.from(newConversations.keys()),
    size: newConversations.size,
    changed:
      JSON.stringify(Array.from(current.keys())) !==
      JSON.stringify(Array.from(newConversations.keys())),
  });
  activeConversations$.set(newConversations);
}

export function deactivateConversation(id: string) {
  console.log('[activeConversations] Deactivating:', id);
  const current = activeConversations$.get();
  console.log('[activeConversations] Before deactivate:', Array.from(current.keys()));

  const newConversations = new Map(current);
  newConversations.delete(id);

  console.log('[activeConversations] After deactivate:', Array.from(newConversations.keys()));
  activeConversations$.set(newConversations);
}

export function updateConversationState(id: string, updates: Partial<ActiveConversation>) {
  const conversations = activeConversations$.get();
  const conversation = conversations.get(id);
  if (conversation) {
    conversations.set(id, { ...conversation, ...updates });
    activeConversations$.set(new Map(conversations));
  }
}
