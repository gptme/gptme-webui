import { Clock, MessageSquare, Lock, Loader2, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getRelativeTimeString } from '@/utils/time';
import { useApi } from '@/contexts/ApiContext';
import type { MessageRole } from '@/types/conversation';
import type { FC } from 'react';
import { observable, Observable } from '@legendapp/state';
import { Computed, For, Memo, observer, use$ } from '@legendapp/state/react';
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
      const conversation = store$.conversations.get(conv.id);

      const getMessageBreakdown = (): MessageBreakdown => {
        if (!conversation?.data?.log) return {};

        return conversation.data.log.reduce((acc: MessageBreakdown, msg$) => {
          const role = msg$.role.get();
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
          <div className="mb-1 font-medium">{stripDate(conv.id)}</div>
          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  {getRelativeTimeString(conv.lastUpdated)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{conv.lastUpdated.toLocaleString()}</TooltipContent>
            </Tooltip>
            <Computed>
              {() => {
                const storeConv = store$.conversations.get(conv.id);
                const isLoaded = storeConv?.data?.log?.length > 0;

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
              {conversation?.isConnected.get() && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="flex items-center">
                      <Signal className="h-4 w-4 text-primary" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Connected</TooltipContent>
                </Tooltip>
              )}
              {conversation?.isGenerating.get() && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Generating...</TooltipContent>
                </Tooltip>
              )}
              {conversation?.pendingTool.get() && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="flex items-center">
                      <span className="text-lg">⚙️</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Pending tool: {conversation.pendingTool.get()?.tooluse.tool}
                  </TooltipContent>
                </Tooltip>
              )}
              {conversation?.readonly.get() && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="flex items-center">
                      <Lock className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>This conversation is read-only</TooltipContent>
                </Tooltip>
              )}
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
      const items = use$(store$.conversations);
      if (isLoading || isError) return null;

      // Convert Map entries to array of ConversationItems
      // Convert Map entries to array and create observable array
      const conversationItems: Observable<ConversationItem[]> = observable(
        Array.from(items.entries()).map(
          ([id, conv]): ConversationItem => ({
            id,
            readonly: conv.readonly ?? false,
            lastUpdated: new Date(conv.lastUpdated.get() || Date.now()),
            messageCount: conv.data.log.length,
          })
        )
      );

      return (
        <For each={conversationItems}>
          {(conv$) => (
            <Memo>
              <ConversationItem conv={conv$.get()} />
            </Memo>
          )}
        </For>
      );
    });

    return (
      <div className="h-full space-y-2 overflow-y-auto p-4">
        <LoadingState />
        <ErrorState />
        <EmptyState />
        <ConversationItems />
      </div>
    );
  }
);
