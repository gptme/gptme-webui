import { mergeIntoObservable, observable } from '@legendapp/state';
import type { ConversationResponse } from '@/types/api';
import type { Message, StreamingMessage, ToolUse } from '@/types/conversation';
import { demoConversations } from '@/democonversations';
import type { DemoConversation } from '@/democonversations';

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
  // Whether to show the initial system message
  showInitialSystem: boolean;
}

// Central store for all conversations
export const conversations$ = observable(new Map<string, ConversationState>());

// Currently selected conversation
export const selectedConversation$ = observable<string>(demoConversations[0].name);

// Helper functions
export function updateConversation(id: string, update: Partial<ConversationState>) {
  if (!conversations$.get(id)) {
    // Initialize with defaults if conversation doesn't exist
    conversations$.set(id, {
      data: { log: [], logfile: id, branches: {} },
      isGenerating: false,
      isConnected: false,
      pendingTool: null,
      showInitialSystem: false,
    });
  }
  mergeIntoObservable(conversations$.get(id), update);
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
    showInitialSystem: false,
  };
  conversations$.set(id, initial);
}

// Update conversation data in the store
export function updateConversationData(id: string, data: ConversationResponse) {
  conversations$.get(id)?.data.set(data);
}

// Bulk initialize conversations with their data
export async function initializeConversations(
  api: { getConversation: (id: string) => Promise<ConversationResponse> },
  conversationIds: string[],
  limit: number = 10
) {
  // Initialize all conversations in store first
  conversationIds.forEach((id) => {
    if (!conversations$.get(id)) {
      // Check if this is a demo conversation
      const demoConv = demoConversations.find((conv: DemoConversation) => conv.name === id);
      if (demoConv) {
        initConversation(id, {
          log: demoConv.messages,
          logfile: id,
          branches: {},
        });
        return;
      }
      initConversation(id);
    }
  });

  // Then load data for the first N non-demo conversations
  const toLoad = conversationIds
    .filter((id) => !demoConversations.some((conv) => conv.name === id))
    .slice(0, limit);

  if (toLoad.length === 0) {
    console.log('[conversations] No non-demo conversations to load');
    return;
  }

  console.log(`[conversations] Loading ${toLoad.length} conversations into store`);

  // Load conversations in parallel
  const results = await Promise.allSettled(
    toLoad.map(async (id) => {
      try {
        const data = await api.getConversation(id);
        updateConversationData(id, data);
        return id;
      } catch (error) {
        console.error(`Failed to load conversation ${id}:`, error);
        throw error;
      }
    })
  );

  // Log results
  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled'
  );
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

  if (succeeded.length) {
    console.log(
      `[conversations] Loaded ${succeeded.length} conversations:`,
      succeeded.map((r) => r.value)
    );
  }
  if (failed.length) {
    console.warn(
      `[conversations] Failed to load ${failed.length} conversations:`,
      failed.map((r) => r.reason)
    );
  }
}
