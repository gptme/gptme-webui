import { observable } from '@legendapp/state';
import type { ObservableObject } from '@legendapp/state';
import type { ConversationResponse } from '@/types/api';
import type { Message, StreamingMessage, ToolUse } from '@/types/conversation';

// Core types
export interface PendingTool {
  id: string;
  tooluse: ToolUse;
}

export interface ConversationItem {
  id: string; // The conversation identifier (filename)
  lastUpdated: Date;
  messageCount: number;
  readonly?: boolean;
}

// Store state types
export interface ConversationStateData {
  data: ConversationResponse;
  isGenerating: boolean;
  isConnected: boolean;
  pendingTool: PendingTool | null;
  lastMessage?: Message;
  showInitialSystem: boolean;
  readonly?: boolean;
  lastUpdated?: number;
}

export type ConversationState = ObservableObject<ConversationStateData>;

export interface StoreData {
  conversations: Map<string, ConversationState>;
  selectedId: string | null;
  ui: {
    leftSidebarOpen: boolean;
    rightSidebarOpen: boolean;
    showInitialSystem: boolean;
    autoScrollAborted: boolean;
    isAutoScrolling: boolean;
  };
  loading: {
    isLoading: boolean;
    error: Error | null;
  };
}

export type Store = ObservableObject<StoreData>;

// Helper function used by conversationList$
function getLastUpdated(convState: ConversationState): Date {
  const log = convState.data.log.get();
  const timestamps = log.map((msg) => {
    return msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
  });

  const lastUpdated = convState.lastUpdated.get();
  return timestamps.length > 0
    ? new Date(Math.max(...timestamps))
    : new Date(lastUpdated || Date.now());
}

// Create root store
export const store$ = observable<StoreData>({
  conversations: new Map(),
  selectedId: null,
  ui: {
    leftSidebarOpen: true,
    rightSidebarOpen: false,
    showInitialSystem: false,
    autoScrollAborted: false,
    isAutoScrolling: false,
  },
  loading: {
    isLoading: false,
    error: null,
  },
});

// For backward compatibility during migration
export const conversations$ = store$.conversations;
export const selectedConversation$ = store$.selectedId;

// Debug logging
store$.conversations.onChange(({ value }) => {
  console.log('[conversations] Map updated:', Array.from(value.keys()));
});

store$.selectedId.onChange(({ value }) => {
  console.log('[conversations] Selected conversation changed:', value);
});

// Store actions
export const actions = {
  // Conversation management
  selectConversation(id: string) {
    store$.selectedId.set(id);
  },

  updateConversation(id: string, update: Partial<ConversationStateData>) {
    const conv = store$.conversations.get(id);
    if (!conv) {
      store$.conversations.set(id, createInitialState(id));
      return;
    }
    conv.assign(update);
  },

  addMessage(id: string, message: Message | StreamingMessage) {
    const conv = store$.conversations.get(id);
    if (conv) {
      // Create an observable message with all fields as observables
      const obsMessage = observable(message);
      conv.data.log.push(obsMessage);
      conv.lastMessage?.set(message);
      conv.lastUpdated.set(Date.now());
    }
  },

  setGenerating(id: string, isGenerating: boolean) {
    actions.updateConversation(id, { isGenerating });
  },

  setConnected(id: string, isConnected: boolean) {
    actions.updateConversation(id, { isConnected });
  },

  setPendingTool(id: string, toolId: string | null, tooluse: ToolUse | null) {
    actions.updateConversation(id, {
      pendingTool: toolId && tooluse ? { id: toolId, tooluse } : null,
    });
  },

  // UI actions
  toggleSidebar(side: 'left' | 'right') {
    store$.ui[`${side}SidebarOpen`].toggle();
  },

  setAutoScroll(aborted: boolean) {
    store$.ui.autoScrollAborted.set(aborted);
  },

  setShowInitialSystem(show: boolean) {
    store$.ui.showInitialSystem.set(show);
  },
};

// Helper functions
function createInitialState(id: string): ConversationState {
  return observable<ConversationStateData>({
    data: {
      log: [],
      logfile: id,
      branches: {},
    },
    isGenerating: false,
    isConnected: false,
    pendingTool: null,
    showInitialSystem: false,
    lastUpdated: Date.now(),
  });
}

// Computed helpers
export const conversationList$ = observable<ConversationItem[]>(() => {
  const convs = store$.conversations.get();
  return Array.from(convs.entries()).map(([id, conv]) => {
    const convState = conv.peek();
    return {
      id,
      readonly: convState.readonly ?? false,
      lastUpdated: getLastUpdated(conv),
      messageCount: convState.data.log.length,
    };
  });
});

// For backward compatibility
export function getConversationItems(): ConversationItem[] {
  return conversationList$.get();
}

// For backward compatibility
export function updateConversation(id: string, update: Partial<ConversationStateData>) {
  actions.updateConversation(id, update);
}

export function addMessage(id: string, message: Message | StreamingMessage) {
  actions.addMessage(id, message);
}

export function setGenerating(id: string, isGenerating: boolean) {
  actions.setGenerating(id, isGenerating);
}

export function setConnected(id: string, isConnected: boolean) {
  actions.setConnected(id, isConnected);
}

export function setPendingTool(id: string, toolId: string | null, tooluse: ToolUse | null) {
  actions.setPendingTool(id, toolId, tooluse);
}

// Initialize and load conversations
export const initialization = {
  // Initialize a single conversation
  initConversation(id: string, data?: ConversationResponse, readonly: boolean = false) {
    console.log('[conversations] Initializing conversation:', id);
    const initial = createInitialState(id);
    if (data) {
      // Create observable data with observable messages
      const obsData = observable({
        ...data,
        log: data.log.map((msg) => observable(msg)),
        branches: Object.fromEntries(
          Object.entries(data.branches).map(([key, msgs]) => [
            key,
            msgs.map((msg) => observable(msg)),
          ])
        ),
      });
      initial.data.set(obsData);
    }
    if (readonly) {
      initial.readonly.set(readonly);
    }
    store$.conversations.set(id, initial);
  },

  // Update conversation data
  updateConversationData(id: string, data: ConversationResponse) {
    const conv = store$.conversations.get(id);
    if (conv) {
      // Create observable data with observable messages
      const obsData = observable({
        ...data,
        log: data.log.map((msg) => observable(msg)),
        branches: Object.fromEntries(
          Object.entries(data.branches).map(([key, msgs]) => [
            key,
            msgs.map((msg) => observable(msg)),
          ])
        ),
      });
      conv.data.set(obsData);
      conv.lastUpdated.set(Date.now());
    }
  },

  // Initialize and preload conversations
  async initializeConversations(
    api: { getConversation: (id: string) => Promise<ConversationResponse> },
    conversationList: { name: string; modified: number; messages: number }[],
    preloadLimit: number = 10
  ) {
    store$.loading.isLoading.set(true);
    store$.loading.error.set(null);

    try {
      console.log(
        `[conversations] Initializing ${conversationList.length} conversations, preloading ${preloadLimit}`
      );

      // Initialize metadata for all conversations
      conversationList.forEach((conv) => {
        if (!store$.conversations.get(conv.name)) {
          initialization.initConversation(conv.name, undefined, false);
          const conversation = store$.conversations.get(conv.name);
          if (conversation) {
            conversation.lastUpdated.set(conv.modified);
          }
        }
      });

      // Preload recent conversations
      const toPreload = conversationList.slice(0, preloadLimit);
      if (toPreload.length > 0) {
        console.log(`[conversations] Preloading ${toPreload.length} conversations`);

        const results = await Promise.allSettled(
          toPreload.map(async (conv) => {
            try {
              const data = await api.getConversation(conv.name);
              initialization.updateConversationData(conv.name, data);
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
          // Set error if any preload failed
          store$.loading.error.set(failed[0].reason);
        }
      }
    } catch (error) {
      console.error('[conversations] Error during initialization:', error);
      store$.loading.error.set(error as Error);
    } finally {
      store$.loading.isLoading.set(false);
      console.log('[conversations] Completed initialization');
    }
  },
};
