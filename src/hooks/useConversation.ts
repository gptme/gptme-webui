import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useApi } from "@/contexts/ApiContext";
import { useToast } from "@/components/ui/use-toast";
import type { ConversationResponse } from "@/types/api";
import type { ConversationMessage } from "@/types/conversation";
import type { ConversationItem } from "@/components/ConversationList";
import { demoConversations } from "@/democonversations";
import type { DemoConversation } from "@/democonversations";

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
  conversation: ConversationItem
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

        // If response is already in correct format, use it directly
        if (!response?.log || !response?.branches) {
          throw new Error("Invalid conversation data received");
        }

        return response;
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
      // Create user message
      const userMessage: ConversationMessage = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };

      // Send the user message first
      await api.sendMessage(conversation.name, userMessage);

      // Return void to match the expected type
      return;
    },
    onMutate: async (message: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData =
        queryClient.getQueryData<ConversationResponse>(queryKey);

      const timestamp = new Date().toISOString();
      
      // Create both messages
      const userMessage: ConversationMessage = {
        role: "user",
        content: message,
        timestamp,
        id: `user-${Date.now()}`,
      };

      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: "",
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
    onSuccess: async (_, _variables, context) => {
      if (!context) return;

      let currentContent = "";

      try {
        // Generate response with streaming
        await api.generateResponse(conversation.name, {
          onToken(token: string) {
            currentContent += token;
            queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
              if (!old) return undefined;
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
          onComplete(message) {
            if (message.role !== "system") {
              queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
                if (!old) return undefined;
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
          onToolOutput(message) {
            queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
              if (!old) return undefined;
              return {
                ...old,
                log: [...old.log, message],
              };
            });
          },
          onError(error) {
            if (error !== "AbortError") {
              toast({
                variant: "destructive",
                title: "Error",
                description: error,
              });
            }
          }
        });
      } catch (error) {
        // Handle interruption
        if (error instanceof DOMException && error.name === "AbortError") {
          console.log("Generation interrupted by user");
        } else {
          throw error;  // Re-throw other errors to be handled by onError
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
