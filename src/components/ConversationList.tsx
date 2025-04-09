import { Clock, MessageSquare, Lock, Loader2, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getRelativeTimeString } from '@/utils/time';
import { useApi } from '@/contexts/ApiContext';
import type { MessageRole } from '@/types/conversation';
import type { FC } from 'react';
import { Computed, Memo, observer, use$ } from '@legendapp/state/react';
import { store$, actions, type ConversationItem } from '@/stores/conversations';

type MessageBreakdown = Partial<Record<MessageRole, number>>;

interface Props {
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
  onRetry?: () => void;
}

export const ConversationList: FC<Props> = observer(
  ({ isLoading = false, isError = false, error, onRetry }) => {
    const { isConnected$ } = useApi();
    const isConnected = use$(isConnected$);
    const selectedId = use$(store$.selectedId);

    // strip leading YYYY-MM-DD from name if present
    function stripDate(name: string) {
      const match = name.match(/^\d{4}-\d{2}-\d{2}[- ](.*)/);
      return match ? match[1] : name;
    }

    const ConversationItem = observer(function ConversationItem({
      conv,
    }: {
      conv: ConversationItem;
    }) {
      const isSelected = conv.id === selectedId;
      // Get the conversation from store
      const conversation = store$.conversations.get(conv.id);

      const getMessageBreakdown = (): MessageBreakdown => {
        if (!conversation?.data?.log?.length) return {};

        return conversation.data.log.reduce((acc: MessageBreakdown, msg) => {
          const role = msg.role?.get();
          if (role) {
            acc[role] = (acc[role] || 0) + 1;
          }
          return acc;
        }, {});
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
        <div
          className={`cursor-pointer rounded-lg p-3 transition-colors hover:bg-accent ${
            isSelected ? 'bg-accent' : ''
          }`}
          onClick={() => actions.selectConversation(conv.id)}
        >
          <div className="mb-1 font-medium" data-testid="conversation-title">
            {stripDate(conv.id)}
          </div>
          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <Tooltip>
              <TooltipTrigger>
                <time className="flex items-center" dateTime={conv.lastUpdated.toISOString()}>
                  <Clock className="mr-1 h-4 w-4" />
                  {getRelativeTimeString(conv.lastUpdated)}
                </time>
              </TooltipTrigger>
              <TooltipContent>{conv.lastUpdated.toLocaleString()}</TooltipContent>
            </Tooltip>
            <Computed>
              {() => {
                const conversation = store$.conversations.get(conv.id);
                const isLoaded = conversation?.data?.log?.length > 0;

                if (!isLoaded) {
                  return (
                    <span className="flex items-center">
                      <MessageSquare className="mr-1 h-4 w-4" />
                      {conv.messageCount}
                    </span>
                  );
                }

                const breakdown = getMessageBreakdown();
                const totalCount = Object.values(breakdown).reduce((a, b) => a + b, 0) || 0;
                const breakdownText = Object.keys(breakdown).length
                  ? formatBreakdown(breakdown)
                  : 'No messages';

                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center">
                        <MessageSquare className="mr-1 h-4 w-4" />
                        {totalCount}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="whitespace-pre">{breakdownText}</div>
                    </TooltipContent>
                  </Tooltip>
                );
              }}
            </Computed>

            {/* Show conversation state indicators */}
            <div className="flex items-center space-x-2">
              <Computed>
                {() => {
                  if (!conversation) return null;
                  const isConnected = conversation.isConnected?.get();
                  const isGenerating = conversation.isGenerating?.get();
                  const pendingTool = conversation.pendingTool?.get();
                  const readonly = conversation.readonly?.get();

                  // Early return if no values
                  if (!isConnected && !isGenerating && !pendingTool && !readonly) {
                    return null;
                  }

                  return (
                    <>
                      {isConnected && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="flex items-center">
                              <Signal className="h-4 w-4 text-primary" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Connected</TooltipContent>
                        </Tooltip>
                      )}
                      {isGenerating && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Generating...</TooltipContent>
                        </Tooltip>
                      )}
                      {pendingTool && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="flex items-center">
                              <span className="text-lg">⚙️</span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Pending tool: {pendingTool?.tooluse?.tool ?? 'Unknown'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {readonly && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="flex items-center">
                              <Lock className="h-4 w-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>This conversation is read-only</TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  );
                }}
              </Computed>
            </div>
          </div>
        </div>
      );
    });

    const LoadingState = () => {
      if (!isLoading) return null;
      return (
        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading conversations...
        </div>
      );
    };

    const ErrorState = () => {
      if (!isError || isLoading) return null;
      return (
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
      );
    };

    const EmptyState = observer(() => {
      const items = use$(store$.conversations);
      if (isLoading || isError || items.size > 0) return null;

      if (!isConnected) {
        return (
          <div className="p-2 text-sm text-muted-foreground">
            Not connected to API. Use the connect button to load conversations.
          </div>
        );
      }
      return (
        <div className="p-2 text-sm text-muted-foreground">
          No conversations found. Start a new conversation to get started.
        </div>
      );
    });

    const ConversationItems = observer(() => {
      if (isLoading || isError) return null;

      return (
        <div>
          <Computed>
            {() => {
              // Get the conversations Map (need reactivity to update when conversations are added)
              const conversations = store$.conversations.get();

              // Convert to array and sort by lastUpdated
              const items = Array.from(conversations.entries())
                .map(([id, conv]): ConversationItem => {
                  const lastUpdated = conv.lastUpdated || Date.now();
                  return {
                    id,
                    readonly: conv.readonly ?? false,
                    lastUpdated: new Date(lastUpdated),
                    messageCount: conv.data?.log?.length ?? 0,
                  };
                })
                .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

              return items.map((conv) => (
                <Memo key={conv.id}>
                  <ConversationItem conv={conv} />
                </Memo>
              ));
            }}
          </Computed>
        </div>
      );
    });

    return (
      <div data-testid="conversation-list" className="h-full space-y-2 overflow-y-auto p-4">
        <LoadingState />
        <ErrorState />
        <EmptyState />
        <ConversationItems />
      </div>
    );
  }
);
