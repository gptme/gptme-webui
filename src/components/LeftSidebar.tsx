import { PanelLeftOpen, PanelLeftClose, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from './ConversationList';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { FC } from 'react';
import { use$ } from '@legendapp/state/react';
import { store$, actions, initialization } from '@/stores/conversations';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const LeftSidebar: FC<Props> = ({
  isOpen,
  onToggle,
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  const { api, isConnected$ } = useApi();
  const isConnected = use$(isConnected$);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleNewConversation = async () => {
    const newId = Date.now().toString();

    // Initialize in store first
    initialization.initConversation(newId);
    actions.selectConversation(newId);

    try {
      // Create on server
      await api.createConversation(newId, []);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({
        title: 'New conversation created',
        description: 'Starting a fresh conversation',
      });
    } catch (error) {
      // Remove from store and show error
      console.log('Error creating conversation:', error);
      store$.conversations.delete(newId);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create new conversation',
      });
    }
  };

  return (
    <div className="relative h-full">
      <div
        className={`border-r transition-all duration-300 ${
          isOpen ? 'w-80' : 'w-0'
        } flex h-full flex-col overflow-hidden`}
      >
        <div className="flex h-12 items-center justify-between border-b px-4">
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
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <ConversationList isLoading={isLoading} isError={isError} onRetry={onRetry} />
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
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute -right-10 top-2 z-50"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
