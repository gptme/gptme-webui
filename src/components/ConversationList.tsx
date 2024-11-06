import { Clock, MessageSquare, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRelativeTimeString } from "@/utils/time";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/contexts/ApiContext";
import { demoConversations } from "@/democonversations";
import type { ConversationResponse } from "@/types/api";
import type { MessageRole } from "@/types/conversation";

import type { FC } from "react";

type MessageBreakdown = Partial<Record<MessageRole, number>>;

// UI-specific type for rendering conversations
export interface ConversationItem {
  name: string;
  lastUpdated: Date;  // Converted from modified timestamp
  messageCount: number;  // From messages count
  readonly?: boolean;
  // Matches Conversation from API but with converted date
}

interface Props {
  conversations: ConversationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
  onRetry?: () => void;
}

export const ConversationList: FC<Props> = ({
  conversations,
  selectedId,
  onSelect,
  isLoading = false,
  isError = false,
  error,
  onRetry,
}) => {
  const { api, isConnected } = useApi();

  if (!conversations) {
    return null;
  }

  // strip leading YYYY-MM-DD from name if present
  function stripDate(name: string) {
    const match = name.match(/^\d{4}-\d{2}-\d{2}[- ](.*)/);
    return match ? match[1] : name;
  }

  const ConversationItem: FC<{ conv: ConversationItem }> = ({ conv }) => {
    // For demo conversations, get messages from demoConversations
    const demoConv = demoConversations.find((dc) => dc.name === conv.name);

    // For API conversations, fetch messages
    const { data: messages } = useQuery<ConversationResponse>({
      queryKey: ["conversation", conv.name],
      queryFn: () => api.getConversation(conv.name),
      enabled: isConnected && !demoConv,
    });

    const getMessageBreakdown = (): MessageBreakdown => {
      if (demoConv) {
        return demoConv.messages.reduce((acc: MessageBreakdown, msg) => {
          acc[msg.role] = (acc[msg.role] || 0) + 1;
          return acc;
        }, {});
      }

      if (!messages?.log) return {};

      return messages.log.reduce((acc: MessageBreakdown, msg) => {
        acc[msg.role] = (acc[msg.role] || 0) + 1;
        return acc;
      }, {});
    };

    const formatBreakdown = (breakdown: MessageBreakdown) => {
      const order: MessageRole[] = ["user", "assistant", "system", "tool"];
      return Object.entries(breakdown)
        .sort(([a], [b]) => {
          const aIndex = order.indexOf(a as MessageRole);
          const bIndex = order.indexOf(b as MessageRole);
          // Put known roles first in specified order, unknown roles after
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        })
        .map(([role, count]) => `${role}: ${count}`)
        .join("\n");
    };

    return (
      <div
        className={`p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors ${
          selectedId === conv.name ? "bg-accent" : ""
        }`}
        onClick={() => onSelect(conv.name)}
      >
        <div className="font-medium mb-1">{stripDate(conv.name)}</div>
        <div className="flex items-center text-sm text-muted-foreground space-x-4">
          <Tooltip>
            <TooltipTrigger>
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {getRelativeTimeString(conv.lastUpdated)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{conv.lastUpdated.toLocaleString()}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" />
                {conv.messageCount}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="whitespace-pre">
                {demoConv || messages?.log
                  ? formatBreakdown(getMessageBreakdown())
                  : "Loading..."}
              </div>
            </TooltipContent>
          </Tooltip>
          {conv.readonly && (
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center">
                  <Lock className="w-4 h-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>This conversation is read-only</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 p-4 h-full overflow-y-auto">
      {isLoading && (
        <div className="flex items-center justify-center text-sm text-muted-foreground p-4">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading conversations...
        </div>
      )}
      {!isLoading && isError && (
        <div className="text-sm text-destructive p-4 space-y-2">
          <div className="font-medium">Failed to load conversations</div>
          <div className="text-muted-foreground">{error?.message}</div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="w-full">
              <Loader2 className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      )}
      {!isLoading && !isError && !isConnected && conversations.length === 0 && (
        <div className="text-sm text-muted-foreground p-2">
          Not connected to API. Use the connect button to load conversations.
        </div>
      )}
      {!isLoading && !isError && isConnected && conversations.length === 0 && (
        <div className="text-sm text-muted-foreground p-2">
          No conversations found. Start a new conversation to get started.
        </div>
      )}
      {!isLoading && !isError && conversations.map((conv) => (
        <ConversationItem key={conv.name} conv={conv} />
      ))}
    </div>
  );
};
