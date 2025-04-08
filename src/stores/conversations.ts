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
  // Whether to show the initial system message
  showInitialSystem: boolean;
  // Metadata
  readonly?: boolean;
  lastUpdated?: number;
  messageCount?: number;
}

// Central store for all conversations
export const conversations$ = observable(new Map<string, ConversationState>());

// Debug logging for Map changes
conversations$.onChange(({ value }) => {
  console.log('[conversations] Map updated:', Array.from(value.keys()));
});

// Currently selected conversation
export const selectedConversation$ = observable<string | null>(null);

// Helper to get all conversations as items
export function getConversationItems() {
  const convs = conversations$.get();
  console.log('[conversations] Getting items from Map:', Array.from(convs.keys()));
  const items = Array.from(convs.entries()).map(([id, conv]) => ({
    name: id,
    readonly: conv.readonly ?? false, // Default to false instead of using !!
    lastUpdated: new Date(conv.lastUpdated ?? Date.now()),
    messageCount: conv.data?.log?.length ?? 0,
  }));
  console.log('[conversations] Returning items:', items);
  return items;
}

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
  conversations$.get(id)?.assign(update);
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
  console.log('[conversations] Initializing conversation:', id);
  const initial: ConversationState = {
    data: data || { log: [], logfile: id, branches: {} },
    isGenerating: false,
    isConnected: false,
    pendingTool: null,
    showInitialSystem: false,
    readonly: false, // Default to not readonly
  };
  conversations$.set(id, initial);
}

// Update conversation data in the store
export function updateConversationData(id: string, data: ConversationResponse) {
  conversations$.get(id)?.data.set(data);
}

// Initialize conversations in the store
// @param conversationList - List of all conversations with metadata (up to 100)
// @param preloadLimit - How many conversations to preload full content for (default 10)
export async function initializeConversations(
  api: { getConversation: (id: string) => Promise<ConversationResponse> },
  conversationList: { name: string; modified: number; messages: number }[],
  preloadLimit: number = 10
) {
  console.log(
    `[conversations] Initializing ${conversationList.length} conversations in store, preloading ${preloadLimit}`
  );

  // Initialize all conversations with their metadata
  conversationList.forEach((conv) => {
    if (!conversations$.get(conv.name)) {
      console.log(
        `[conversations] Adding conversation to store: ${conv.name} (${conv.messages} messages)`
      );
      conversations$.set(conv.name, {
        data: { log: [], logfile: conv.name, branches: {} },
        isGenerating: false,
        isConnected: false,
        pendingTool: null,
        showInitialSystem: false,
        lastUpdated: conv.modified,
        messageCount: conv.messages,
        readonly: false, // API conversations are not readonly
      });
    }
  });

  // Preload full content for most recent conversations
  const toPreload = conversationList.slice(0, preloadLimit);
  if (toPreload.length === 0) {
    console.log('[conversations] No conversations to preload');
    return;
  }

  console.log(`[conversations] Preloading full content for ${toPreload.length} conversations`);

  // Load full conversation data in parallel
  const results = await Promise.allSettled(
    toPreload.map(async (conv) => {
      try {
        const data = await api.getConversation(conv.name);
        updateConversationData(conv.name, data);
        return conv.name;
      } catch (error) {
        console.error(`Failed to load conversation ${conv.name}:`, error);
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

  console.log('[conversations] Completed initialization');
}
