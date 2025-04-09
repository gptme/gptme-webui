import { observable } from '@legendapp/state';
import type { Message, StreamingMessage, ToolUse } from '@/types/conversation';
import type { ConversationResponse } from '@/types/api';

// Core types
export interface PendingTool {
  id: string;
  tooluse: ToolUse;
}

export interface ConversationItem {
  id: string;
  lastUpdated: Date;
  messageCount: number;
  readonly?: boolean;
}

// Individual conversation store
export function createConversationStore(id: string, initialData?: ConversationResponse) {
  const conversation$ = observable({
    // State
    data: initialData || {
      log: [],
      logfile: id,
      branches: {},
    },
    isGenerating: false,
    isConnected: false,
    pendingTool: null as PendingTool | null,
    lastMessage: null as Message | null,
    readonly: false,
    lastUpdated: Date.now(),

    // Actions
    setGenerating: (generating: boolean) => {
      conversation$.isGenerating.set(generating);
    },

    setConnected: (connected: boolean) => {
      conversation$.isConnected.set(connected);
    },

    setPendingTool: (toolId: string | null, tooluse: ToolUse | null) => {
      conversation$.pendingTool.set(toolId && tooluse ? { id: toolId, tooluse } : null);
    },

    addMessage: (message: Message | StreamingMessage) => {
      const obsMessage = observable(message);
      conversation$.data.log.push(obsMessage);
      conversation$.lastMessage.set(message);
      conversation$.lastUpdated.set(Date.now());
    },

    updateData: (data: ConversationResponse) => {
      conversation$.data.set(observable(data));
    },

    setReadonly: (readonly: boolean) => {
      conversation$.readonly.set(readonly);
    },
  });

  return conversation$;
}

// When trying to move this into the store, it doesn't work "This expression is not callable."
export function initConversation(
  id: string,
  data?: ConversationResponse,
  readonly: boolean = false
) {
  const conv = createConversationStore(id, data);
  if (readonly) {
    conv.setReadonly(readonly);
  }
  store$.conversations.get().set(id, conv);
  return conv;
}

export type ConversationStore = ReturnType<typeof createConversationStore>;

// Get underlying type for the observable
export type Conversation = ReturnType<ConversationStore['get']>;

// Root store
export const store$ = observable({
  // State
  conversations: new Map<string, ConversationStore>(),
  selectedId: null as string | null,
  ui: {
    leftSidebarOpen: true,
    rightSidebarOpen: false,
    showInitialSystem: false,
    autoScrollAborted: false,
    isAutoScrolling: false,
  },
  loading: {
    isLoading: false,
    error: null as Error | null,
  },

  // Computed values
  get selectedConversation(): ConversationStore | null {
    const id = store$.selectedId.get();
    return id ? store$.conversations.get().get(id) || null : null;
  },

  get conversationList(): ConversationItem[] {
    const convs = store$.conversations.get();
    console.log(convs);
    const ids = Array.from(convs.keys());
    console.log(ids);
    return ids.map((id) => {
      const conv: Conversation = convs.get(id);
      return {
        id,
        readonly: conv?.readonly || false,
        lastUpdated: conv?.lastUpdated || new Date(0),
        messageCount: conv?.data.log.length || 0,
      };
    });
  },

  // Actions
  selectConversation(id: string) {
    store$.selectedId.set(id);
  },

  toggleSidebar(side: 'left' | 'right') {
    store$.ui[`${side}SidebarOpen`].toggle();
  },

  setAutoScroll(aborted: boolean) {
    store$.ui.autoScrollAborted.set(aborted);
  },

  setAutoScrolling(scrolling: boolean) {
    store$.ui.isAutoScrolling.set(scrolling);
  },

  getOrCreateConversation(id: string): ConversationStore {
    let conv$ = store$.conversations.get().get(id);
    if (!conv$) {
      conv$ = createConversationStore(id);
      store$.conversations.set(id, conv$);
    }
    return conv$;
  },

  initializeConversations: async (
    api: { getConversation: (id: string) => Promise<ConversationResponse> },
    conversationList: { name: string; modified: number; messages: number }[],
    preloadLimit = 10
  ) => {
    store$.loading.isLoading.set(true);
    store$.loading.error.set(null);

    try {
      // Initialize all conversations with basic data
      conversationList.forEach((conv) => {
        if (!store$.conversations.get().get(conv.name)) {
          const conversation = initConversation(conv.name);
          conversation.lastUpdated.set(conv.modified * 1000); // Convert to milliseconds
        }
      });

      // Preload recent conversations
      const toPreload = conversationList.slice(0, preloadLimit);
      if (toPreload.length > 0) {
        const results = await Promise.allSettled(
          toPreload.map(async (conv) => {
            try {
              const data = await api.getConversation(conv.name);
              const conversation = store$.conversations.get().get(conv.name);
              if (conversation) {
                conversation.updateData(data);
              }
              return conv.name;
            } catch (error) {
              console.error(`Failed to load conversation ${conv.name}:`, error);
              throw error;
            }
          })
        );

        const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
        if (failed.length) {
          console.error(
            `Failed to load ${failed.length} conversations:`,
            failed.map((r) => r.reason)
          );
          store$.loading.error.set(failed[0].reason);
        }
      }
    } catch (error) {
      console.error('[conversations] Error during initialization:', error);
      store$.loading.error.set(error as Error);
    } finally {
      store$.loading.isLoading.set(false);
    }
  },
});
