import { Clock, MessageSquare, Lock } from "lucide-react";
import type { Conversation } from "@/types/conversation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRelativeTimeString } from "@/utils/time";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/contexts/ApiContext";
import { demoConversations } from "@/democonversations";

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

import type { FC } from "react";

export const ConversationList: FC<Props> = ({
  conversations,
  selectedId,
  onSelect,
}) => {
  const api = useApi();

  if (!conversations) {
    return null;
  }

  // strip leading YYYY-MM-DD from name if present
  function stripDate(name: string) {
    const match = name.match(/^\d{4}-\d{2}-\d{2}[- ](.*)/);
    return match ? match[1] : name;
  }

  const getMessageBreakdown = (convName: string) => {
    // For demo conversations, get messages from demoConversations
    const demoConv = demoConversations.find(conv => conv.name === convName);
    if (demoConv) {
      const breakdown = demoConv.messages.reduce((acc, msg) => {
        acc[msg.role] = (acc[msg.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return breakdown;
    }

    // For API conversations, fetch messages
    const { data: messages } = useQuery({
      queryKey: ["conversation", convName],
      queryFn: () => api.getConversation(convName),
      enabled: api.isConnected && !demoConv,
    });

    if (!messages) return {};

    return (Array.isArray(messages) ? messages : messages.log).reduce((acc, msg) => {
      acc[msg.role] = (acc[msg.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const formatBreakdown = (breakdown: Record<string, number>) => {
    return Object.entries(breakdown)
      .map(([role, count]) => `${role}: ${count}`)
      .join('\n');
  };

  return (
    <div className="space-y-2 p-4 h-full overflow-y-auto">
      {conversations.map((conv) => (
        <div
          key={conv.name}
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
              <TooltipContent>
                {conv.lastUpdated.toLocaleString()}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {conv.messageCount}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="whitespace-pre">
                  {formatBreakdown(getMessageBreakdown(conv.name))}
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
                <TooltipContent>
                  This conversation is read-only
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};