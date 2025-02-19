import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApi } from "@/contexts/ApiContext";
import { useToast } from "@/components/ui/use-toast";
import type { ConversationResponse } from "@/types/api";
import type { Message } from "@/types/conversation";
import type { ConversationItem } from "@/components/ConversationList";
import { demoConversations } from "@/democonversations";
import type { DemoConversation } from "@/democonversations";

interface UseConversationResult {
  conversationData: ConversationResponse | undefined;
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isGenerating: boolean;
}

function getDemo(name: string): DemoConversation | undefined {
  return demoConversations.find((conv) => conv.name === name);
}

export function useConversation(
  conversationId: string | undefined
): UseConversationResult {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    return () => {
      queryClient.cancelQueries({
        queryKey: ["conversation", conversationId],
      });
    };
  }, [conversationId, queryClient]);

  const queryKey = ["conversation", conversationId];

  const {
    data: conversationData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!conversationId) {
        return undefined;
      }

      if (conversationId === "demo") {
        const demo = getDemo(conversationId);
        return {
          log: demo?.messages || [],
          logfile: conversationId,
          branches: {},
        } as ConversationResponse;
      }

      try {
        const response = await api.getConversation(conversationId);

        if (signal.aborted) {
          throw new Error("Query was cancelled");
        }

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
    enabled: Boolean(conversationId && api.isConnected),
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    refetchInterval: 0,
  });

  interface MutationContext {
    previousData: ConversationResponse | undefined;
    userMessage: Message;
    assistantMessage: Message;
  }

  const [isLoadingState, setIsLoadingState] = useState(isLoading || isFetching);

  const { mutateAsync: sendMessage } = useMutation<void, Error, string, MutationContext>({
    mutationFn: async (message: string) => {
      setIsGenerating(true);
      try {
        const userMessage: Message = {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        };

        await api.sendMessage(conversationId, userMessage);
      } catch (error) {
        setIsGenerating(false);
        throw error;
      }
    },
    onMutate: async (message: string) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<ConversationResponse>(queryKey);

      const timestamp = new Date().toISOString();

      const userMessage: Message = {
        role: "user",
        content: message,
        timestamp,
        id: `user-${Date.now()}`,
      };

      const assistantMessage: Message = {
        role: "assistant",
        content: "",
        timestamp,
        id: `assistant-${Date.now()}`,
      };

      queryClient.setQueryData<ConversationResponse>(queryKey, (old) => ({
        ...(old || { logfile: conversationId, branches: {} }),
        log: [...(old?.log || []), userMessage, assistantMessage],
      }));

      return {
        previousData,
        userMessage,
        assistantMessage,
      };
    },
    onSuccess: async (_, _variables, context) => {
      if (!context) return;

      let currentContent = "";
      let currentMessageId = context.assistantMessage.id;
      setIsGenerating(true);

      const handleToken = (token: string) => {
        currentContent += token;
        queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
          if (!old) return undefined;
          return {
            ...old,
            log: old.log.map((msg) =>
              msg.id === currentMessageId
                ? { ...msg, content: currentContent }
                : msg
            ),
          };
        });
      };

      const handleComplete = (message: Message) => {
        if (message.role !== "system") {
          queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
            if (!old) return undefined;
            return {
              ...old,
              log: old.log.map((msg) =>
                msg.id === currentMessageId
                  ? { ...message, id: currentMessageId }
                  : msg
              ),
            };
          });
        }
      };

      const handleInterrupt = () => {
        console.log("Generation interrupted by user");
        setIsGenerating(false);
        queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
          if (!old) return undefined;
          return {
            ...old,
            log: old.log.map((msg) =>
              msg.id === currentMessageId
                ? { ...msg, content: msg.content + "\n\n[interrupted]" }
                : msg
            ),
          };
        });
      };

      const handleError = (error: string) => {
        if (error === "AbortError") {
          handleInterrupt();
        } else {
          setIsGenerating(false);
          toast({
            variant: "destructive",
            title: "Error",
            description: error,
          });
        }
      };

      const handleToolOutput = async (message: Message) => {
        if (!isGenerating) return;

        queryClient.setQueryData<ConversationResponse>(queryKey, (old) => {
          if (!old) return undefined;
          return {
            ...old,
            log: [...old.log, message],
          };
        });

        const currentLog = queryClient.getQueryData<ConversationResponse>(queryKey)?.log || [];
        const toolUseCount = currentLog.filter(msg => msg.role === "tool").length;
        if (toolUseCount > 10) {
          console.warn("Too many tool uses, stopping auto-generation");
          toast({
            title: "Warning",
            description: "Stopped auto-generation after 10 tool uses",
          });
          setIsGenerating(false);
          return;
        }

        try {
          await api.generateResponse(conversationId, {
            onToken: handleToken,
            onComplete: handleComplete,
            onToolOutput: handleToolOutput,
            onError: handleError,
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            handleInterrupt();
          } else {
            setIsGenerating(false);
            throw error;
          }
        }
      };

      try {
        await api.generateResponse(conversationId, {
          onToken: handleToken,
          onComplete: handleComplete,
          onToolOutput: handleToolOutput,
          onError: handleError,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          handleInterrupt();
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to generate response",
          });
          throw error;
        }
      }
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message or generate response",
      });
      console.error("Error in mutation:", error);
    },
  });

  useEffect(() => {
    return () => {
      setIsGenerating(false);
    };
  }, []);

  return {
    conversationData,
    sendMessage,
    isLoading: isLoadingState,
    isGenerating,
  };
}
