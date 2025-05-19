import { Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from './ConversationList';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import type { ConversationItem } from './ConversationList';
import { useQueryClient } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { FC } from 'react';
import { use$ } from '@legendapp/state/react';
import { type Observable } from '@legendapp/state';

interface Props {
  conversations: ConversationItem[];
  selectedConversationId$: Observable<string | null>;
  onSelectConversation: (id: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
  onRetry?: () => void;
  route: string;
}

export const LeftSidebar: FC<Props> = ({
  conversations,
  selectedConversationId$,
  onSelectConversation,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  route,
}) => {
  const { api, isConnected$ } = useApi();
  const isConnected = use$(isConnected$);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleNewConversation = async () => {
    const newId = Date.now().toString();
    // Navigate immediately for instant UI feedback
    navigate(`${route}?conversation=${newId}`);

    // Create conversation in background
    api
      .createConversation(newId, [])
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        toast({
          title: 'New conversation created',
          description: 'Starting a fresh conversation',
        });
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to create new conversation',
        });
        // Optionally navigate back on error
        navigate(route);
      });
  };

  return (
    <div className="h-full">
      <div className="flex h-full flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-4">
          <h2 className="font-semibold">Conversations</h2>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNewConversation}
                      disabled={!isConnected}
                      data-testid="new-conversation-button"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {!isConnected ? 'Connect to create new conversations' : 'Create new conversation'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedId$={selectedConversationId$}
            onSelect={onSelectConversation}
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={onRetry}
          />
          <div className="border-t p-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://github.com/gptme/gptme"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:text-foreground"
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                gptme
              </a>
              <a
                href="https://github.com/gptme/gptme-webui"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:text-foreground"
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                gptme-webui
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
