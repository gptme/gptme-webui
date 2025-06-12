import { Clock, MessageSquare, Lock, Loader2, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getRelativeTimeString } from '@/utils/time';
import { useApi } from '@/contexts/ApiContext';
import { demoConversations } from '@/democonversations';

import type { MessageRole } from '@/types/conversation';
import { type FC } from 'react';
import { Computed, use$ } from '@legendapp/state/react';
import { type Observable } from '@legendapp/state';
import { conversations$ } from '@/stores/conversations';

type MessageBreakdown = Partial<Record<MessageRole, number>>;

// UI-specific type for rendering conversations
export interface ConversationItem {
  id: string;
  name: string;
  lastUpdated: Date;
  messageCount: number;
  readonly?: boolean;
  workspace?: string;
}

interface Props {
  conversations: ConversationItem[];
  onSelect: (id: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
  onRetry?: () => void;
  selectedId$?: Observable<string | null>;
}

export const ConversationList: FC<Props> = ({
  conversations,
  onSelect,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  selectedId$,
}) => {
  const { isConnected$ } = useApi();
  const isConnected = use$(isConnected$);
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
    const demoConv = demoConversations.find((dc) => dc.id === conv.id);

    // For API conversations, fetch messages
    const getMessageBreakdown = (): MessageBreakdown => {
      if (demoConv) {
        return demoConv.messages.reduce((acc: MessageBreakdown, msg) => {
          acc[msg.role] = (acc[msg.role] || 0) + 1;
          return acc;
        }, {});
      }

      // Get messages from store
      const storeConv = conversations$.get(conv.id)?.get();
      // Return empty breakdown if conversation or data is not loaded yet
      if (!storeConv?.data?.log) return {};

      return storeConv.data.log.reduce((acc: MessageBreakdown, msg$) => {
        const role = msg$.role;
        if (role && typeof role === 'string') {
          acc[role as MessageRole] = (acc[role as MessageRole] || 0) + 1;
        }
        return acc;
      }, {} as MessageBreakdown);
    };

    const formatBreakdown = (breakdown: MessageBreakdown) => {
      const order: MessageRole[] = ['user', 'assistant', 'system', 'tool'];
      return Object.entries(breakdown)
        .sort(([a], [b]) => {
          const aIndex = order.indexOf(a as MessageRole);
          const bIndex = order.indexOf(b as MessageRole);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        })
        .map(([role, count]) => `${role}: ${count}`)
        .join('\n');
    };

    return (
      <Computed>
        {() => {
          const convState = conversations$.get(conv.id)?.get();
          const isSelected = selectedId$?.get() === conv.id;

          return (
            <div
              className={`cursor-pointer rounded-lg py-2 pl-2 transition-colors hover:bg-accent ${
                isSelected ? 'bg-accent' : ''
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <div>
                <div
                  data-testid="conversation-title"
                  className="font-small mb-1 whitespace-nowrap"
                  style={{
                    maskImage:
                      'linear-gradient(to right, black 0%, black calc(100% - 2rem), transparent 100%)',
                    WebkitMaskImage:
                      'linear-gradient(to right, black 0%, black calc(100% - 2rem), transparent 100%)',
                  }}
                >
                  {conv.name || stripDate(conv.id)}
                </div>
                <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger>
                      <time
                        className="flex items-center whitespace-nowrap"
                        dateTime={conv.lastUpdated.toISOString()}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {getRelativeTimeString(conv.lastUpdated)}
                      </time>
                    </TooltipTrigger>
                    <TooltipContent>{conv.lastUpdated.toLocaleString()}</TooltipContent>
                  </Tooltip>
                  <Computed>
                    {() => {
                      const storeConv = conversations$.get(conv.id)?.get();
                      const isLoaded = storeConv?.data?.log?.length > 0;

                      if (!isLoaded) {
                        return (
                          <span className="flex items-center">
                            <MessageSquare className="mr-1 h-3 w-3" />
                            {conv.messageCount}
                          </span>
                        );
                      }

                      const breakdown = getMessageBreakdown();
                      const totalCount = Object.values(breakdown).reduce((a, b) => a + b, 0);

                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center">
                              <MessageSquare className="mr-1 h-3 w-3" />
                              {totalCount}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="whitespace-pre">{formatBreakdown(breakdown)}</div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }}
                  </Computed>

                  {/* Show conversation state indicators */}
                  <div className="flex items-center space-x-2">
                    {convState?.isConnected && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="flex items-center">
                            <Signal className="h-3 w-3 text-primary" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Connected</TooltipContent>
                      </Tooltip>
                    )}
                    {convState?.isGenerating && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="flex items-center">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Generating...</TooltipContent>
                      </Tooltip>
                    )}
                    {convState?.pendingTool && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="flex items-center">
                            <span className="text-lg">⚙️</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Pending tool: {convState.pendingTool.tooluse.tool}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {conv.readonly && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="flex items-center">
                            <Lock className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>This conversation is read-only</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </Computed>
    );
  };

  return (
    <div data-testid="conversation-list" className="h-full space-y-2 overflow-y-auto p-3">
      {isLoading && (
        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading conversations...
        </div>
      )}
      {!isLoading && isError && (
        <div className="space-y-2 p-4 text-sm text-destructive">
          <div className="font-medium">Failed to load conversations</div>
          <div className="text-muted-foreground">{error?.message}</div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="w-full">
              <Loader2 className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      )}
      {!isLoading && !isError && !isConnected && conversations.length === 0 && (
        <div className="p-2 text-sm text-muted-foreground">
          Not connected to API. Use the connect button to load conversations.
        </div>
      )}
      {!isLoading && !isError && isConnected && conversations.length === 0 && (
        <div className="p-2 text-sm text-muted-foreground">
          No conversations found. Start a new conversation to get started.
        </div>
      )}
      {!isLoading &&
        !isError &&
        conversations.map((conv) => <ConversationItem key={conv.id} conv={conv} />)}
    </div>
  );
};
