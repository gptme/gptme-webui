import { useEffect } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/use-toast';
import type { ConversationResponse } from '@/types/api';
import type { Message, StreamingMessage, ToolUse } from '@/types/conversation';
import type { ConversationItem } from '@/components/ConversationList';
import { demoConversations } from '@/democonversations';
import type { DemoConversation } from '@/democonversations';
import type { ChatOptions } from '@/components/ChatInput';
import { useObservable } from '@legendapp/state/react';
import { type Observable, syncState } from '@legendapp/state';

// New type for pending tools
export interface PendingTool {
  id: string;
  tooluse: ToolUse;
}

interface UseConversationResult {
  conversationData$: Observable<ConversationResponse | undefined>;
  sendMessage: (messageInput: { message: string; options?: ChatOptions }) => Promise<void>;
  isLoading$: Observable<boolean>;
  isGenerating$: Observable<boolean>;
  pendingTool$: Observable<PendingTool | null>;
  confirmTool: (
    action: 'confirm' | 'edit' | 'skip' | 'auto',
    options?: { content?: string; count?: number }
  ) => Promise<void>;
  interruptGeneration: () => Promise<void>;
}

function getDemo(name: string): DemoConversation | undefined {
  return demoConversations.find((conv) => conv.name === name);
}

export function useConversation(conversation: ConversationItem): UseConversationResult {
  const api = useApi();
  const { toast } = useToast();
  const isGenerating$ = useObservable<boolean>(false);
  const pendingTool$ = useObservable<PendingTool | null>(null);

  console.log('[useConversation] conversation.name', conversation.name);

  const conversationData$ = useObservable<ConversationResponse>({
    log: [],
    logfile: conversation.name,
    branches: {},
  });

  // Fetch conversation data
  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
        console.log('[useConversation] Querying conversation', conversation.name);
        let newData: ConversationResponse;

        if (conversation.readonly) {
          const demo = getDemo(conversation.name);
          newData = {
            log: demo?.messages || [],
            logfile: conversation.name,
            branches: {},
          };
        } else {
          const response = await api.getConversation(conversation.name);
          if (!response?.log || !response?.branches) {
            throw new Error('Invalid conversation data received');
          }
          newData = response;
        }

        if (!isCancelled) {
          conversationData$.set(newData);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
        if (!isCancelled) {
          conversationData$.set({
            log: [],
            logfile: conversation.name,
            branches: {},
          });
        }
      }
    };

    void fetchData();

    return () => {
      isCancelled = true;
    };
  }, [conversation.name, conversation.readonly, api, conversationData$]);

  const state$ = syncState(conversationData$);
  const isLoading$ = useObservable(state$.isGetting);

  // Subscribe to the event stream as soon as the conversation is loaded
  useEffect(() => {
    if (!conversation.readonly && api.isConnected && conversation.name) {
      console.log(`[useConversation] Auto-subscribing to events for ${conversation.name}`);

      // Subscribe to events
      //
      // NOTE: issues could occur if a client subscribes to a conversation that is already generating.
      //
      // i.e. if the client misses a message_start event (by connecting mid-generation),
      // it will not know to set isGenerating to true, and will miss tokens at the start of the message.
      //
      // This could be mitigated by having the server keep events since message_start and send them when a client subscribes to an ongoing generation.
      // Could also happen if there is latency between the conversation retrieval and subscribing to the event stream.
      api.subscribeToEvents(conversation.name, {
        onMessageStart: () => {
          console.log('[useConversation] Received message start');
          isGenerating$.set(true);

          // Check if we already have placeholder message
          const lastMessage$ = conversationData$.log[conversationData$.log.length - 1];
          if (lastMessage$.role.get() === 'assistant' && lastMessage$.content.get() === '') {
            return;
          }

          // Add a new assistant message
          const streamingMessage: StreamingMessage = {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            isComplete: false,
          };
          conversationData$.log.push(streamingMessage);
        },
        onToken: (token) => {
          isGenerating$.set(true);

          const lastMessage$ = conversationData$.log[conversationData$.log.length - 1];

          // Update the UI when tokens come in
          if (lastMessage$.role.get() === 'assistant') {
            conversationData$.log[conversationData$.log.length - 1].content.set(
              (prev) => prev + token
            );
          } else {
            console.warn('Token without started message (should never happen)');
          }
        },
        onMessageComplete: (message) => {
          console.log('[useConversation] Received complete message');

          // Update the conversation with the complete message
          const lastMessage$ = conversationData$.log[conversationData$.log.length - 1];
          if (lastMessage$.role.get() === 'assistant') {
            lastMessage$.content.set(message.content);
            // Type guard to check if message is StreamingMessage
            const lastMessage = lastMessage$.get();
            if ('isComplete' in lastMessage) {
              (lastMessage$ as Observable<StreamingMessage>).isComplete.set(true);
            }
          } else {
            console.warn("Message complete without assistant's message (should never happen)");
            conversationData$.log.push(message);
          }

          isGenerating$.set(false);
        },
        onToolPending: (toolId, tooluse, auto_confirm) => {
          console.log(`[useConversation] Received tool pending with ${toolId}:`, tooluse);
          if (auto_confirm) {
            throw new Error('Auto-confirmation not supported');
          }
          pendingTool$.set({
            id: toolId,
            tooluse,
          });
        },
        onMessageAdded: (message) => {
          console.log('[useConversation] Received message:', message);

          // Check last 2 messages for duplicates
          const recentMessages = conversationData$.log.slice(-2);
          const isDuplicate = recentMessages.some(
            (msg) => msg.role === message.role && msg.content === message.content
          );
          const isSystem = message.role === 'system';
          if (isSystem) {
            isGenerating$.set(false);
          }

          if (isDuplicate) {
            console.log('[useConversation] Ignoring duplicate message:', message);
            return;
          }

          console.log('[useConversation] Adding message to conversation:', message);
          conversationData$.log.push(message);
        },
        onInterrupted: () => {
          console.log('[useConversation] Generation interrupted');

          // Clear generating state
          isGenerating$.set(false);

          // Clear any pending tool
          if (pendingTool$.get()) {
            pendingTool$.set(null);
          }

          // Mark the conversation as interrupted in the UI
          const lastMessage$ = conversationData$.log[conversationData$.log.length - 1];

          // Only add [interrupted] if it's not already there
          if (
            lastMessage$.role.get() === 'assistant' &&
            !lastMessage$.content.get().toLowerCase().includes('[interrupted]')
          ) {
            lastMessage$.content.set((prev) => prev + ' [INTERRUPTED]');
          }
        },
        onError: (error) => {
          console.error('[useConversation] Error from event stream:', error);
        },
      });

      // Cleanup function to close the event stream when unmounting
      return () => {
        console.log(`[useConversation] Closing event stream for ${conversation.name}`);
        api.closeEventStream(conversation.name);
      };
    }
  }, [
    conversation.name,
    conversation.readonly,
    api,
    api.isConnected,
    conversationData$,
    isGenerating$,
    pendingTool$,
  ]);

  const sendMessage = async ({ message, options }: { message: string; options?: ChatOptions }) => {
    console.log('[useConversation] sendMessage', {
      message,
      options,
    });
    isGenerating$.set(true);

    // Create user message (non-streaming)
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    // Create assistant message (streaming)
    const assistantMessage: StreamingMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isComplete: false,
    };

    // Optimistically update to the new value
    conversationData$.log.push(userMessage, assistantMessage);

    try {
      // Send the user message first
      await api.sendMessage(conversation.name, userMessage);
    } catch (error) {
      isGenerating$.set(false);

      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message or generate response',
      });
      console.error('Error in mutation:', error);
    }

    try {
      // Ensure we're ready to receive events
      console.log('[useConversation] Ensuring event stream is ready');

      isGenerating$.set(true);

      // Initial generation
      console.log('[useConversation] Starting generation');
      await api.step(conversation.name, options?.model, options?.stream);

      console.log('[useConversation] Generation started, waiting for events');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        isGenerating$.set(false);
      }

      // Show error toast and rethrow
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate response',
      });
      throw error;
    }
  };

  const interruptGeneration = async () => {
    try {
      console.log('Interrupting generation via API');

      // First, clear any pending tool
      if (pendingTool$.get()) {
        pendingTool$.set(null);
      }

      // Interrupt the generation via API
      try {
        await api.interruptGeneration(conversation.name);
        console.log('Interrupt API call successful');
      } catch (error) {
        // If the endpoint doesn't exist or other API error, just log and continue
        const apiError = error as { status?: number };
        console.warn(`Interrupt API call failed (status ${apiError?.status || 'unknown'}):`, error);
      }

      // Always update local state
      isGenerating$.set(false);

      console.log('Generation interrupted successfully');
    } catch (error) {
      console.error('Error in interrupt handler:', error);
      // Still update local state even if something goes wrong
      isGenerating$.set(false);
    }
  };

  const confirmTool = async (
    action: 'confirm' | 'edit' | 'skip' | 'auto',
    options?: { content?: string; count?: number }
  ) => {
    if (!pendingTool$.get()) {
      console.warn('No pending tool to confirm');
      return;
    }

    try {
      console.log(
        `[useConversation] Confirming tool ${pendingTool$.get()?.id} with action: ${action}`
      );

      // Set generating state immediately to prevent showing the dialog again
      isGenerating$.set(true);

      // Store the pending tool info before clearing it
      const toolId = pendingTool$.get()?.id;
      if (!toolId) {
        console.warn('No pending tool to confirm');
        return;
      }

      // Clear the pending tool right away to prevent duplicate dialogs
      pendingTool$.set(null);

      // Call the API to confirm the tool - this will execute the tool on the server
      console.log(`[useConversation] Calling tool confirm API with action: ${action}`);
      await api.confirmTool(conversation.name, toolId, action, options);
      console.log(
        `[useConversation] Tool confirmation API call successful - waiting for output events`
      );

      console.log('[useConversation] Tool confirmation successful, waiting for tool output events');
    } catch (error) {
      console.error('Error confirming tool:', error);

      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to confirm tool execution',
      });

      // Clear the pending tool to avoid getting stuck
      pendingTool$.set(null);
    }
  };

  return {
    conversationData$,
    sendMessage,
    isLoading$,
    isGenerating$,
    pendingTool$,
    confirmTool,
    interruptGeneration,
  };
}
