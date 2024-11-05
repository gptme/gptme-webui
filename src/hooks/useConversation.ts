import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useApi } from "@/contexts/ApiContext";
import type { Message } from "@/types/message";
import { useToast } from "@/components/ui/use-toast";
import type { Conversation } from "@/types/conversation";
import { demoConversations } from "@/democonversations";
import type { DemoConversation } from "@/democonversations";

interface ConversationResponse {
  log: Message[];
  logfile: string;
  branches?: Record<string, Message[]>;
}

interface UseConversationResult {
  conversationData: ConversationResponse | undefined;
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isSending: boolean;
}

function getDemo(name: string): DemoConversation | undefined {
  return demoConversations.find((conv) => conv.name === name);
}

export function useConversation(
  conversation: Conversation
): UseConversationResult {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      queryClient.cancelQueries({
        queryKey: ["conversation", conversation.name],
      });
    };
  }, [conversation.name, queryClient]);

  const queryKey = ["conversation", conversation.name, conversation.readonly];

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
          throw new Error("Query was cancelled");
        }

        // Transform the response to match ConversationResponse type
        if (Array.isArray(response)) {
          return {
            log: response,
            logfile: conversation.name,
            branches: {},
          } as ConversationResponse;
        }

        // If response is already in correct format, use it directly
        const typedResponse = response as ConversationResponse;

        if (!typedResponse?.log || !typedResponse?.logfile) {
          throw new Error("Invalid conversation data received");
        }

        return typedResponse;
      } catch (error) {
        throw new Error(
          `Failed to fetch conversation: ${(error as Error).message}`
        );
      }
    },
    enabled: Boolean(
      conversation.name && (conversation.readonly || api.isConnected)
    ),
    staleTime: 0, // Always treat data as stale
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    refetchInterval: 0, // Disable automatic refetching
  });

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (message: string) => {
      // console.log('Starting mutation for message:', message);

      // Create user message
      const userMessage = {
        role: "user" as const,
        content: message,
        timestamp: new Date().toISOString(),
        id: `user-${Date.now()}`,
      };

      // Send the user message first
      await api.sendMessage(conversation.name, userMessage);

      return {
        userMessage,
        assistantMessageId: `assistant-${Date.now()}`,
      };
    },
    onMutate: async (message: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData =
        queryClient.getQueryData<ConversationResponse>(queryKey);

      // Create both messages
      const userMessage = {
        role: "user" as const,
        content: message,
        timestamp: new Date().toISOString(),
        id: `user-${Date.now()}`,
      };

      const assistantMessage = {
        role: "assistant" as const,
        content: "",
        timestamp: new Date().toISOString(),
        id: `assistant-${Date.now()}`,
      };

      // console.log('Adding messages:', { userMessage, assistantMessage });

      // Optimistically update to the new value
      queryClient.setQueryData<ConversationResponse>(queryKey, (old) => ({
        ...(old || { branches: {} }),
        logfile: conversation.name,
        log: [...(old?.log || []), userMessage, assistantMessage],
      }));

      // Return context
      return {
        previousData,
        userMessage,
        assistantMessage,
      };
    },
    onSuccess: async (_, variables, context) => {
      if (!context) return;

      let currentContent = "";

      // Generate response with streaming
      await api.generateResponse(conversation.name, {
        onToken: (token: string) => {
          // console.log('Received token:', token);
          currentContent += token;

          // Update the assistant message content
          queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
            if (!old) return null;

            return {
              ...old,
              log: old.log.map((msg) =>
                msg.id === context.assistantMessage.id
                  ? { ...msg, content: currentContent }
                  : msg
              ),
            };
          });
        },
        onComplete: (message) => {
          if (message.role !== "system") {
            queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
              if (!old) return null;
              return {
                ...old,
                log: old.log.map((msg) =>
                  msg.id === context.assistantMessage.id
                    ? { ...message, id: context.assistantMessage.id }
                    : msg
                ),
              };
            });
          }
        },
        onToolOutput: (message) => {
          const toolMessageId = `tool-${Date.now()}`;
          queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
            if (!old) return null;
            return {
              ...old,
              log: [...old.log, { ...message, id: toolMessageId }],
            };
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error,
          });
        },
      });

      // No duplicate generateResponse needed - the first one handles everything
    },
    onError: (error, variables, context) => {
      // Roll back to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      // Show error toast
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message or generate response",
      });
      console.error("Error in mutation:", error);
    },
  });

  const isLoadingState = isLoading || isFetching || isSending;

  return {
    conversationData,
    sendMessage,
    isLoading: isLoadingState,
    isSending,
  };
}
