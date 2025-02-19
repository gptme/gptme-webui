
import { type FC, useState, useMemo, useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WelcomeView } from "./WelcomeView";
import { useConversation } from "@/hooks/useConversation";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Loader2 } from "lucide-react";
import type { ConversationItem } from "./ConversationList";
import { useApi } from "@/contexts/ApiContext";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  conversation?: ConversationItem;
}

export const ConversationContent: FC<Props> = ({ conversation }) => {
  const { conversationData, sendMessage, isLoading, isGenerating } =
    useConversation(conversation?.name ?? null);
  const [showInitialSystem, setShowInitialSystem] = useState(false);
  const api = useApi();
  const queryClient = useQueryClient();

  // If no conversation is selected, show the welcome view
  if (!conversation) {
    return <WelcomeView onActionSelect={sendMessage} />;
  }

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
      const firstNonSystem = messages.findIndex((msg) => msg.role !== "system");
      const hasInitialSystemMessages = firstNonSystem > 0;

      return {
        currentMessages: messages,
        firstNonSystemIndex:
          firstNonSystem === -1 ? messages.length : firstNonSystem,
        hasSystemMessages: hasInitialSystemMessages,
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
        {hasSystemMessages ? (
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
        ) : null}
        {currentMessages.map((msg, index) => {
          const isInitialSystem =
            msg.role === "system" && index < firstNonSystemIndex;
          if (isInitialSystem && !showInitialSystem) {
            return null;
          }

          const previousMessage = index > 0 ? currentMessages[index - 1] : null;
          const nextMessage = index < currentMessages.length - 1 ? currentMessages[index + 1] : null;

          return (
            <ChatMessage
              key={`${index}-${msg.timestamp}-${msg.content.length}`}
              message={msg}
              previousMessage={previousMessage}
              nextMessage={nextMessage}
              conversationId={conversation.name}
            />
          );
        })}
        <div className="mb-[10vh]"></div>
      </div>
      <ChatInput
        onSend={sendMessage}
        onInterrupt={async () => {
          console.log("Interrupting from ConversationContent...");
          await api.cancelPendingRequests();
          queryClient.invalidateQueries({
            queryKey: ["conversation", conversation.name],
          });
        }}
        isReadOnly={conversation.readonly}
        isGenerating={isGenerating}
      />
    </main>
  );
};
