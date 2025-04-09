import { useEffect } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/use-toast';
import type { Message, StreamingMessage } from '@/types/conversation';
import type { ChatOptions } from '@/components/ChatInput';
import { demoConversations } from '@/democonversations';
import { use$ } from '@legendapp/state/react';
import { store$, initConversation } from '@/stores/conversations';

const MAX_CONNECTED_CONVERSATIONS = 3;

export function useConversation(conversationId: string) {
  const api = useApi();
  const { toast } = useToast();
  const conversation$ = store$.conversations.get().get(conversationId);
  const isConnected = use$(api.isConnected$);

  // Initialize conversation in store if needed
  useEffect(() => {
    if (!conversation$) {
      console.log(`[useConversation] Initializing conversation ${conversationId}`);
      initConversation(conversationId);
    }
  }, [conversationId, conversation$]);

  // Load conversation data and connect to event stream
  useEffect(() => {
    if (!isConnected || conversation$?.isConnected.get() || !conversation$) {
      return;
    }

    const loadAndConnect = async () => {
      try {
        // Check if this is a demo conversation
        const demoConv = demoConversations.find((conv) => conv.name === conversationId);
        if (demoConv) {
          // Initialize with demo data
          store$.conversations.get(conversationId).updateData({
            log: demoConv.messages,
            logfile: conversationId,
            branches: {},
          });
          return;
        }

        // Load conversation data from API
        const data = await api.getConversation(conversationId);
        conversation$?.updateData(data);

        // Check number of connected conversations
        const connectedConvs = Array.from(store$.conversations.get().entries())
          .filter(([_, state]) => state.isConnected.get())
          .map(([id]) => id);

        // If we're at the limit, disconnect the oldest one that isn't selected
        if (connectedConvs.length >= MAX_CONNECTED_CONVERSATIONS) {
          const selectedId = store$.selectedId.get();
          const toDisconnect = connectedConvs
            .filter((id) => id !== selectedId)
            .slice(0, connectedConvs.length - MAX_CONNECTED_CONVERSATIONS + 1);

          console.log(`[useConversation] Disconnecting old conversations:`, toDisconnect);
          for (const id of toDisconnect) {
            api.closeEventStream(id);
            conversation$.setConnected(false);
          }
        }

        // Connect to event stream
        console.log(`[useConversation] Connecting to ${conversationId}`);
        api.subscribeToEvents(conversationId, {
          onMessageStart: () => {
            console.log('[useConversation] Generation started');
            conversation$.setGenerating(true);

            // Add empty message placeholder if needed
            const messages$ = conversation$?.data.log;
            const lastMessage$ = messages$?.[messages$.length - 1];
            if (lastMessage$.role.get() !== 'assistant' || lastMessage$.content.get() !== '') {
              const streamingMessage: StreamingMessage = {
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
                isComplete: false,
              };
              conversation$.addMessage(streamingMessage);
            }
          },
          onToken: (token) => {
            const messages$ = conversation$?.data.log;
            const lastMessage$ = messages$?.[messages$.length - 1];
            if (lastMessage$?.role.get() === 'assistant') {
              lastMessage$.content.set((prev) => prev + token);
            }
          },
          onMessageComplete: (message) => {
            console.log('[useConversation] Generation complete');
            conversation$.setGenerating(false);

            // Update the last message
            const messages$ = conversation$?.data.log;
            const lastMessage$ = messages$?.[messages$.length - 1];
            if (lastMessage$?.role.get() === 'assistant') {
              lastMessage$.content.set(message.content);
              if ('isComplete' in lastMessage$) {
                lastMessage$.isComplete.set(true);
              }
            }
          },
          onMessageAdded: (message) => {
            console.log('[useConversation] Message added:', message);
            // Check if this message already exists (ignoring timestamp)
            const messages$ = conversation$?.data.log;
            const lastMessage$ = messages$?.[messages$.length - 1];
            if (
              lastMessage$?.role.get() === message.role &&
              lastMessage$?.content.get() === message.content
            ) {
              console.log('[useConversation] Skipping duplicate message');
              return;
            }
            conversation$.addMessage(message);
          },
          onToolPending: (toolId, tooluse, auto_confirm) => {
            console.log('[useConversation] Tool pending:', { toolId, tooluse, auto_confirm });
            if (auto_confirm) {
              // Auto-confirm immediately if requested
              api.confirmTool(conversationId, toolId, 'confirm').catch((error) => {
                console.error('[useConversation] Error auto-confirming tool:', error);
              });
            } else {
              // Only set pending tool state if we need confirmation
              conversation$.setPendingTool(toolId, tooluse);
            }
          },
          onInterrupted: () => {
            console.log('[useConversation] Generation interrupted');
            conversation$.setGenerating(false);
            conversation$.setPendingTool(null, null);

            // Mark the last message as interrupted
            const messages$ = conversation$?.data.log;
            const lastMessage$ = messages$?.[messages$.length - 1];
            if (lastMessage$?.role.get() === 'assistant') {
              const content = lastMessage$.content.get();
              if (!content.toLowerCase().includes('[interrupted]')) {
                lastMessage$.content.set(content + ' [INTERRUPTED]');
              }
            }
          },
          onError: (error) => {
            console.error('[useConversation] Error:', error);
            toast({
              variant: 'destructive',
              title: 'Error',
              description: error,
            });
          },
        });

        conversation$.setConnected(true);
      } catch (error) {
        console.error('Error loading conversation:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load conversation',
        });
      }
    };

    void loadAndConnect();

    // Cleanup function - only disconnect if page is being unloaded
    return () => {
      if (document.hidden) {
        console.log(`[useConversation] Page hidden, disconnecting from ${conversationId}`);
        api.closeEventStream(conversationId);
        conversation$.setConnected(false);
      }
    };
  }, [conversationId, isConnected, api, conversation$, toast]);

  const sendMessage = async ({ message, options }: { message: string; options?: ChatOptions }) => {
    if (!conversation$) {
      throw new Error('Conversation not initialized');
    }

    console.log('[useConversation] Sending message:', { message, options });

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    // Add message to conversation
    conversation$.addMessage(userMessage);

    try {
      // Send the message
      await api.sendMessage(conversationId, userMessage);

      // Start generation
      await api.step(conversationId, options?.model, options?.stream);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message',
      });
      throw error;
    }
  };

  const confirmTool = async (
    action: 'confirm' | 'edit' | 'skip' | 'auto',
    options?: { content?: string; count?: number }
  ) => {
    const pendingTool = conversation$?.pendingTool.get();
    if (!pendingTool) {
      console.warn('No pending tool to confirm');
      return;
    }

    try {
      // Clear pending tool state immediately
      conversation$?.setPendingTool(null, null);

      // Confirm the tool
      await api.confirmTool(conversationId, pendingTool.id, action, options);
    } catch (error) {
      console.error('Error confirming tool:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to confirm tool',
      });
    }
  };

  const interruptGeneration = async () => {
    try {
      await api.interruptGeneration(conversationId);
    } catch (error) {
      console.error('Error interrupting generation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to interrupt generation',
      });
    }
  };

  return {
    conversation$,
    sendMessage,
    confirmTool,
    interruptGeneration,
  };
}
