import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/use-toast';
import type { ConversationResponse } from '@/types/api';
import type { Message } from '@/types/conversation';
import type { ConversationItem } from '@/components/ConversationList';
import { demoConversations } from '@/democonversations';
import type { DemoConversation } from '@/democonversations';
import type { ChatOptions } from '@/components/ChatInput';

interface UseConversationResult {
  conversationData: ConversationResponse | undefined;
  sendMessage: (messageInput: string | { message: string; options?: ChatOptions }) => Promise<void>;
  isLoading: boolean;
  isGenerating: boolean;
}

function getDemo(name: string): DemoConversation | undefined {
  return demoConversations.find((conv) => conv.name === name);
}

export function useConversation(conversation: ConversationItem): UseConversationResult {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      queryClient.cancelQueries({
        queryKey: ['conversation', conversation.name],
      });
    };
  }, [conversation.name, queryClient]);

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

  const [isGenerating, setIsGenerating] = useState(false);

  // Helper functions for response generation callbacks
  const createHandlers = (
    currentMessageId: string,
    updateCurrentContent: (content: string) => void
  ) => {
    let currentContent = '';

    // Handler for token streaming
    const handleToken = (token: string) => {
      currentContent += token;
      updateCurrentContent(currentContent);
      queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
        if (!old) return undefined;
        return {
          ...old,
          log: old.log.map((msg) =>
            msg.id === currentMessageId ? { ...msg, content: currentContent } : msg
          ),
        };
      });
    };

    // Handler for message completion
    const handleComplete = (message: Message) => {
      if (message.role !== 'system') {
        queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
          if (!old) return undefined;
          return {
            ...old,
            log: old.log.map((msg) =>
              msg.id === currentMessageId ? { ...message, id: currentMessageId } : msg
            ),
          };
        });
      }
      setIsGenerating(false);
    };

    // Handler for interruptions
    const handleInterrupt = () => {
      console.log('Generation interrupted by user');
      setIsGenerating(false);
      // Add [interrupted] to the current message
      queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
        if (!old) return undefined;
        return {
          ...old,
          log: old.log.map((msg) =>
            msg.id === currentMessageId
              ? { ...msg, content: msg.content + '\n\n[interrupted]' }
              : msg
          ),
        };
      });
    };

    // Handler for errors
    const handleError = (error: string) => {
      if (error === 'AbortError') {
        handleInterrupt();
      } else {
        setIsGenerating(false);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error,
        });
      }
    };

    // Handler for tool output
    const handleToolOutput = async (message: Message, options?: ChatOptions) => {
      if (!isGenerating) return;

      // Add tool output to conversation
      queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
        if (!old) return undefined;
        return {
          ...old,
          log: [...old.log, message],
        };
      });

      // Safety check - prevent infinite loops
      const currentLog = queryClient.getQueryData<ConversationResponse>(queryKey)?.log || [];
      const toolUseCount = currentLog.filter((msg) => msg.role === 'tool').length;
      if (toolUseCount > 10) {
        console.warn('Too many tool uses, stopping auto-generation');
        toast({
          title: 'Warning',
          description: 'Stopped auto-generation after 10 tool uses',
        });
        setIsGenerating(false);
        return;
      }

      // After tool output, continue generating
      console.log('[useConversation] Preparing to continue after tool output', {
        isGenerating,
        previousMessageId: currentMessageId,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        id: `assistant-${Date.now()}`,
      };

      // Add empty assistant message for streaming
      queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
        if (!old) return undefined;
        console.log('[useConversation] Adding new assistant message for continuation', {
          newMessageId: assistantMessage.id,
          isGenerating,
        });
        return {
          ...old,
          log: [...old.log, assistantMessage],
        };
      });

      // Create new handlers for the continuation
      const newHandlers = createHandlers(assistantMessage.id!, () => {});

      console.log('[useConversation] Starting continued generation', {
        newMessageId: assistantMessage.id,
        isGenerating,
      });

      // Continue generating with the new assistant message
      try {
        // Ensure conversation name is a string
        if (!conversation.name) {
          throw new Error('Conversation name is required');
        }

        await api.generateResponse(
          conversation.name as string,
          {
            onToken: newHandlers.handleToken,
            onComplete: newHandlers.handleComplete,
            onToolOutput: (msg) => newHandlers.handleToolOutput(msg, options),
            onError: newHandlers.handleError,
          },
          options
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          newHandlers.handleInterrupt();
        } else {
          setIsGenerating(false);
          throw error;
        }
      }
    };

    return {
      handleToken,
      handleComplete,
      handleInterrupt,
      handleError,
      handleToolOutput,
    };
  };

  // Function to start generation
  const startGeneration = async (messageId: string, options?: ChatOptions): Promise<void> => {
    setIsGenerating(true);

    const handlers = createHandlers(messageId, () => {});

    try {
      // Ensure conversation name is a string
      if (!conversation.name) {
        throw new Error('Conversation name is required');
      }

      // Initial generation
      await api.generateResponse(
        conversation.name as string,
        {
          onToken: handlers.handleToken,
          onComplete: handlers.handleComplete,
          onToolOutput: (msg) => handlers.handleToolOutput(msg, options),
          onError: handlers.handleError,
        },
        options
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        handlers.handleInterrupt();
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
  };

  const { mutateAsync: mutateMessage } = useMutation<
    void,
    Error,
    { message: string; options?: ChatOptions },
    MutationContext
  >({
    mutationFn: async ({ message, options: _options }) => {
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
      await startGeneration(context.assistantMessage.id!, options);
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

  const isLoadingState = isLoading || isFetching;

  // Cleanup generation state on unmount
  useEffect(() => {
    return () => {
      setIsGenerating(false);
    };
  }, []);

  // Create a wrapper function that accepts both string and object input
  const sendMessage = (
    messageInput: string | { message: string; options?: ChatOptions }
  ): Promise<void> => {
    // Parse input into message and options
    let options: ChatOptions | undefined;
    let message: string;

    if (typeof messageInput === 'string') {
      message = messageInput;
    } else {
      message = messageInput.message;
      options = messageInput.options;
    }

    // Use the mutation with our extracted options
    return mutateMessage({ message, options });
  };

  return {
    conversationData,
    sendMessage,
    isLoading: isLoadingState,
    isGenerating,
  };
}
