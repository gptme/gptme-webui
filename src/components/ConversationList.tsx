import { Clock, MessageSquare, Lock, Loader2, Signal, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getRelativeTimeString } from '@/utils/time';
import { useApi } from '@/contexts/ApiContext';
import { demoConversations } from '@/democonversations';

import type { MessageRole } from '@/types/conversation';
import { useState, type FC } from 'react';
import { Computed, use$ } from '@legendapp/state/react';
import { type Observable } from '@legendapp/state';
import { conversations$ } from '@/stores/conversations';
import { DeleteConversationConfirmationDialog } from './DeleteConversationConfirmationDialog';

type MessageBreakdown = Partial<Record<MessageRole, number>>;

// UI-specific type for rendering conversations
export interface ConversationItem {
  name: string;
  lastUpdated: Date;
  messageCount: number;
  readonly?: boolean;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

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
    const getMessageBreakdown = (): MessageBreakdown => {
      if (demoConv) {
        return demoConv.messages.reduce((acc: MessageBreakdown, msg) => {
          acc[msg.role] = (acc[msg.role] || 0) + 1;
          return acc;
        }, {});
      }

      // Get messages from store
      const storeConv = conversations$.get(conv.name)?.get();
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
          const convState = conversations$.get(conv.name)?.get();
          const isSelected = selectedId$?.get() === conv.name;

          return (
            <div
              className={`cursor-pointer rounded-lg p-3 transition-colors hover:bg-accent ${
                isSelected ? 'bg-accent' : ''
              }`}
              onClick={() => onSelect(conv.name)}
            >
              <div data-testid="conversation-title" className="mb-1 font-medium">
                {stripDate(conv.name)}
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
                    const storeConv = conversations$.get(conv.name)?.get();
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
                    const totalCount = Object.values(breakdown).reduce((a, b) => a + b, 0);

                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center">
                            <MessageSquare className="mr-1 h-4 w-4" />
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
                          <Signal className="h-4 w-4 text-primary" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Connected</TooltipContent>
                    </Tooltip>
                  )}
                  {convState?.isGenerating && (
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
                          <Lock className="h-4 w-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>This conversation is read-only</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger>
                      <span
                        className="flex items-center"
                        onClick={() => {
                          setConversationToDelete(conv.name);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Delete conversation</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          );
        }}
      </Computed>
    );
  };

  return (
    <div data-testid="conversation-list" className="h-full space-y-2 overflow-y-auto p-4">
      <DeleteConversationConfirmationDialog
        conversationName={conversationToDelete ?? ''}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDelete={() => {
          setConversationToDelete(null);
        }}
      />
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
        conversations.map((conv) => <ConversationItem key={conv.name} conv={conv} />)}
    </div>
  );
};
