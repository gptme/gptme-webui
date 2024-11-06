import type { FC } from "react";
import { useState, useMemo, useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useConversation } from "@/hooks/useConversation";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Loader2 } from "lucide-react";
import type { ConversationItem } from "./ConversationList";
import { useApi } from "@/contexts/ApiContext";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  conversation: ConversationItem;
}

export const ConversationContent: FC<Props> = ({ conversation }) => {
  const { conversationData, sendMessage, isLoading, isSending } =
    useConversation(conversation);
  const [showInitialSystem, setShowInitialSystem] = useState(false);
  const api = useApi();
  const queryClient = useQueryClient();

  // Reset checkbox state when conversation changes
  useEffect(() => {
    setShowInitialSystem(false);
  }, [conversation.name]);

  const { currentMessages, firstNonSystemIndex, hasSystemMessages } =
    useMemo(() => {
      if (!conversationData?.log) {
        return {
          currentMessages: [],
          firstNonSystemIndex: 0,
          hasSystemMessages: false,
        };
      }

      const messages = conversationData.log;
      // console.log('ConversationContent: Messages:', messages);

      const firstNonSystem = messages.findIndex((msg) => msg.role !== "system");
      const hasSystemMessages = messages.some((msg) => msg.role === "system");

      return {
        currentMessages: messages,
        firstNonSystemIndex:
          firstNonSystem === -1 ? messages.length : firstNonSystem,
        hasSystemMessages,
      };
    }, [conversationData]);

  // Create a ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Memoize the messages content string
  const messagesContent = useMemo(
    () => currentMessages.map((msg) => msg.content).join(""),
    [currentMessages]
  );

  // Single effect to handle all scrolling
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
      }
    };

    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(scrollToBottom);
  }, [
    currentMessages.length, // Scroll on new messages
    messagesContent, // Scroll on content changes (streaming)
    conversation.name, // Scroll when conversation changes
  ]);

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
        {hasSystemMessages && (
          <div className="flex items-center w-full bg-accent/50">
            <div className="flex items-center gap-2 flex-1 p-4 max-w-3xl mx-auto">
              <Checkbox
                id="showInitialSystem"
                checked={showInitialSystem}
                onCheckedChange={(checked) => {
                  if (!isLoading) {
                    setShowInitialSystem(checked as boolean);
                  }
                }}
                disabled={isLoading}
              />
              <Label
                htmlFor="showInitialSystem"
                className={`text-sm text-muted-foreground hover:text-foreground ${
                  isLoading ? "opacity-50" : "cursor-pointer"
                }`}
              >
                Show initial system messages
              </Label>
            </div>
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
        {currentMessages.map((msg, index) => {
          // Hide all system messages before the first non-system message by default
          const isInitialSystem =
            msg.role === "system" && index < firstNonSystemIndex;
          if (isInitialSystem && !showInitialSystem) {
            return null;
          }

          return (
            <ChatMessage
              key={`${index}-${msg.timestamp}-${msg.content.length}`}
              message={msg}
              isInitialSystem={isInitialSystem}
            />
          );
        })}
      </div>
      <ChatInput
        onSend={sendMessage}
        onInterrupt={async () => {
          console.log("Interrupting from ConversationContent...");
          await api.cancelPendingRequests();
          // Invalidate the query to ensure UI updates
          queryClient.invalidateQueries({
            queryKey: ["conversation", conversation.name],
          });
        }}
        isReadOnly={conversation.readonly}
        isSending={isSending}
      />
    </main>
  );
};
