import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/use-toast';
import type { ConversationResponse } from '@/types/api';
import type { Message } from '@/types/conversation';
import type { ConversationItem } from '@/components/ConversationList';
import { demoConversations } from '@/democonversations';
import type { DemoConversation } from '@/democonversations';
import type { ChatOptions } from '@/components/ChatInput';

// New type for pending tools
export interface PendingTool {
  id: string;
  tool: string;
  args: string[];
  content: string;
}

interface UseConversationResult {
  conversationData: ConversationResponse | undefined;
  sendMessage: (messageInput: string | { message: string; options?: ChatOptions }) => Promise<void>;
  isLoading: boolean;
  isGenerating: boolean;
  pendingTool: PendingTool | null;
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingTool, setPendingTool] = useState<PendingTool | null>(null);

  // Add refs to track current values without triggering effect reruns
  const isGeneratingRef = useRef(isGenerating);
  const pendingToolRef = useRef(pendingTool);

  // Keep refs updated with latest values
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    pendingToolRef.current = pendingTool;
  }, [pendingTool]);

  // Subscribe to the event stream as soon as the conversation is loaded
  useEffect(() => {
    if (!conversation.readonly && api.isConnected && conversation.name) {
      console.log(`[useConversation] Auto-subscribing to events for ${conversation.name}`);

      // Subscribe to events
      api.subscribeToEvents(conversation.name, {
        onToken: (token) => {
          console.log('[useConversation] Received token');

          // Update the UI when tokens come in
          queryClient.setQueryData<ConversationResponse>(
            ['conversation', conversation.name, conversation.readonly],
            (old) => {
              if (!old?.log?.length) return old;

              // Find the last assistant message to update, or create one if needed
              const lastMsg = old.log[old.log.length - 1];

              // If last message is from assistant, append to it
              if (lastMsg.role === 'assistant') {
                return {
                  ...old,
                  log: [
                    ...old.log.slice(0, -1),
                    {
                      ...lastMsg,
                      content: lastMsg.content + token,
                    },
                  ],
                };
              } else {
                // If last message is from user or system, add a new assistant message
                return {
                  ...old,
                  log: [
                    ...old.log,
                    {
                      role: 'assistant',
                      content: token,
                      timestamp: new Date().toISOString(),
                      id: `assistant-stream-${Date.now()}`,
                    },
                  ],
                };
              }

              return old;
            }
          );
        },
        onComplete: (message) => {
          console.log('[useConversation] Received complete message');
          // Update the conversation with the complete message
          queryClient.setQueryData<ConversationResponse>(
            ['conversation', conversation.name, conversation.readonly],
            (old) => {
              if (!old) return undefined;

              // Check if this message is already in the log to avoid duplicates
              const messageExists = old.log.some(
                (msg) => msg.role === message.role && msg.content === message.content
              );

              if (!messageExists) {
                return {
                  ...old,
                  log: [...old.log, message],
                };
              }
              return old;
            }
          );
        },
        onToolPending: (toolId, tool, args, content) => {
          console.log('[useConversation] Received tool pending');

          // Check if we're already generating, which means we're handling a tool
          // or if we have already seen this tool
          if (isGeneratingRef.current || pendingToolRef.current) {
            console.log('[useConversation] Ignoring tool pending event during active generation');
            return;
          }

          setPendingTool({
            id: toolId,
            tool,
            args,
            content,
          });
        },
        onMessageAdded: (message) => {
          console.log('[useConversation] Received message:', message);

          // Update the conversation with the user message from another tab
          queryClient.setQueryData<ConversationResponse>(
            ['conversation', conversation.name, conversation.readonly],
            (old) => {
              if (!old) return undefined;

              // Check if this message is already in the log to avoid duplicates
              const messageExists = old.log.some(
                (msg) =>
                  msg.role === message.role &&
                  msg.content === message.content &&
                  // If timestamps are very close (within 2 seconds), consider it the same message
                  (!msg.timestamp ||
                    !message.timestamp ||
                    Math.abs(
                      new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()
                    ) < 2000)
              );

              if (!messageExists) {
                console.log('[useConversation] Adding user message to conversation:', message);
                return {
                  ...old,
                  log: [
                    ...old.log,
                    {
                      ...message,
                      id: message.id || `user-from-another-tab-${Date.now()}`,
                    },
                  ],
                };
              }
              return old;
            }
          );
        },
        onError: (error) => {
          console.error('[useConversation] Error from event stream:', error);
        },
      });

      // Cleanup function to close the event stream when unmounting
      return () => {
        console.log(`[useConversation] Closing event stream for ${conversation.name}`);
        api.closeEventStream(conversation.name);
        queryClient.cancelQueries({
          queryKey: ['conversation', conversation.name],
        });
      };
    }

    // If not connected or readonly, just clean up queries
    return () => {
      queryClient.cancelQueries({
        queryKey: ['conversation', conversation.name],
      });
    };
  }, [conversation.name, conversation.readonly, api, api.isConnected, queryClient]);

  const queryKey = ['conversation', conversation.name, conversation.readonly];

  const {
    data: conversationData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (conversation.readonly) {
        const demo = getDemo(conversation.name);
        return {
          log: demo?.messages || [],
          logfile: conversation.name,
          branches: {},
        } as ConversationResponse;
      }

      try {
        const response = await api.getConversation(conversation.name);

        if (signal.aborted) {
          throw new Error('Query was cancelled');
        }

        // If response is already in correct format, use it directly
        if (!response?.log || !response?.branches) {
          throw new Error('Invalid conversation data received');
        }

        return response;
      } catch (error) {
        throw new Error(`Failed to fetch conversation: ${(error as Error).message}`);
      }
    },
    enabled: Boolean(conversation.name && (conversation.readonly || api.isConnected)),
    staleTime: 0, // Always treat data as stale
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    refetchInterval: 0, // Disable automatic refetching
  });

  interface MutationContext {
    previousData: ConversationResponse | undefined;
    userMessage: Message;
    assistantMessage: Message;
  }

  // Add explicit interrupt method
  const interruptGeneration = async () => {
    try {
      console.log('Interrupting generation via API');

      // First, clear any pending tool
      if (pendingTool) {
        setPendingTool(null);
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
      setIsGenerating(false);

      // Mark the conversation as interrupted in the UI
      queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
        if (!old?.log?.length) return old;

        // Find the last assistant message
        const messages = [...old.log];
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            // Only add [interrupted] if it's not already there
            if (!messages[i].content.includes('[interrupted]')) {
              messages[i] = {
                ...messages[i],
                content: messages[i].content + '[interrupted]',
              };
            }
            break;
          }
        }

        return {
          ...old,
          log: messages,
        };
      });

      console.log('Generation interrupted successfully');
    } catch (error) {
      console.error('Error in interrupt handler:', error);
      // Still update local state even if something goes wrong
      setIsGenerating(false);
    }
  };

  // New function to confirm a pending tool
  const confirmTool = async (
    action: 'confirm' | 'edit' | 'skip' | 'auto',
    options?: { content?: string; count?: number }
  ) => {
    if (!pendingTool) {
      console.warn('No pending tool to confirm');
      return;
    }

    try {
      console.log(`[useConversation] Confirming tool ${pendingTool.id} with action: ${action}`);

      // Set generating state immediately to prevent showing the dialog again
      setIsGenerating(true);

      // Store the pending tool info before clearing it
      const toolId = pendingTool.id;

      // Clear the pending tool right away to prevent duplicate dialogs
      setPendingTool(null);

      // Call the API to confirm the tool - this will execute the tool on the server
      console.log(`[useConversation] Calling tool confirm API with action: ${action}`);
      await api.confirmTool(conversation.name, toolId, action, options);
      console.log(
        `[useConversation] Tool confirmation API call successful - waiting for output events`
      );

      // For the  API, we don't need to manually reconnect - the server will automatically
      // execute the tool and send events through the already established event stream.
      console.log('[useConversation] Tool confirmation successful, waiting for tool output events');
    } catch (error) {
      console.error('Error confirming tool:', error);

      // Check if it's a 404 error - this means the endpoint doesn't exist (server is v1)
      const apiError = error as { status?: number };
      if (apiError.status === 404) {
        console.warn('Tool confirmation endpoint not available - server may be using v1 API');

        // If auto-confirming, just continue without the API call
        if (action === 'auto') {
          console.log('Auto-continuing despite missing endpoint');
          setPendingTool(null);
          return;
        }

        // If confirming, also continue
        if (action === 'confirm') {
          console.log('Continuing despite missing endpoint');
          setPendingTool(null);
          return;
        }

        // If skipping, clear the pending tool and interrupt generation
        if (action === 'skip') {
          setPendingTool(null);
          try {
            await api.interruptGeneration(conversation.name);
            setIsGenerating(false);
          } catch (err) {
            console.error('Error interrupting generation after skip:', err);
          }
          return;
        }
      }

      // For other errors, show a toast
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to confirm tool execution',
      });

      // Clear the pending tool to avoid getting stuck
      setPendingTool(null);
    }
  };

  // TODO: remove?
  // these were passed to step before, but now we only listed to them in the event stream
  /*
  const currentMessageId = context.assistantMessage.id;
  let callbacks = {
    onToken: (token) => {
      // Update the assistant message with the token
      queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
        if (!old) return undefined;
        return {
          ...old,
          log: old.log.map((msg) =>
            msg.id === currentMessageId ? { ...msg, content: msg.content + token } : msg
          ),
        };
      });
    },
    onComplete: (message) => {
      if (message.role !== 'system') {
        queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
          if (!old) return undefined;
          return {
            ...old,
            log: old.log.map((msg) =>
              msg.id === currentMessageId
                ? { ...message, id: currentMessageId, completed: true }
                : msg
            ),
          };
        });
      }
    },
    onToolPending: (toolId, tool, args, content) => {
      console.log('[useConversation] Tool pending:', { toolId, tool, args });
      setPendingTool({
        id: toolId,
        tool,
        args,
        content,
      });
    },
    onToolOutput: handleToolOutput,
    onError: (error) => {
      if (error === 'AbortError') {
        setIsGenerating(false);
      } else {
        setIsGenerating(false);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error,
        });
      }
    },
  };
  */
  // Define the mutation to send a message
  const { mutateAsync: sendMessage } = useMutation<void, Error, string, MutationContext>({
    mutationFn: async (message: string) => {
      setIsGenerating(true);
      try {
        // Create user message
        const userMessage: Message = {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        };

        // Send the user message first
        await api.sendMessage(conversation.name, userMessage);
      } catch (error) {
        setIsGenerating(false);
        throw error;
      }
    },
    onMutate: async ({ message }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ConversationResponse>(queryKey);

      const timestamp = new Date().toISOString();

      // Create both messages
      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp,
        id: `user-${Date.now()}`,
      };

      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp,
        id: `assistant-${Date.now()}`,
      };

      // Optimistically update to the new value
      queryClient.setQueryData<ConversationResponse>(queryKey, (old) => ({
        ...(old || { logfile: conversation.name, branches: {} }),
        log: [...(old?.log || []), userMessage, assistantMessage],
      }));

      // Return context
      return {
        previousData,
        userMessage,
        assistantMessage,
      };
    },
    onSuccess: async (_, { options }, context) => {
      if (!context) return;

      setIsGenerating(true);

      try {
        // Initial generation
        await api.step(
          conversation.name,
          undefined, // use default model
          'main' // branch
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setIsGenerating(false);
        } else {
          // Show error toast and rethrow
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to generate response',
          });
          throw error;
        }
      }
    },
    onError: (error, _variables, context) => {
      // Roll back to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message or generate response',
      });
      console.error('Error in mutation:', error);
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsGenerating(false);
      setPendingTool(null);
    };
  }, []);

  return {
    conversationData,
    sendMessage,
    isLoading: isLoading || isFetching,
    isGenerating,
    pendingTool,
    confirmTool,
    interruptGeneration,
  };
}
