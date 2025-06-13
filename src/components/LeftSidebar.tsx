import { Plus, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from './ConversationList';
import { AgentsList } from './AgentsList';
import { WorkspaceList } from './WorkspaceList';
import { useApi } from '@/contexts/ApiContext';
import { useNavigate } from 'react-router-dom';
import type { ConversationSummary } from '@/types/conversation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { selectedWorkspace$ } from '@/stores/sidebar';

import type { FC } from 'react';
import { use$ } from '@legendapp/state/react';
import { type Observable } from '@legendapp/state';
import { useState, useMemo } from 'react';

interface Props {
  conversations: ConversationSummary[];
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
  const { isConnected$ } = useApi();
  const isConnected = use$(isConnected$);
  const selectedWorkspace = use$(selectedWorkspace$);
  const navigate = useNavigate();
  const [agentsCollapsed, setAgentsCollapsed] = useState(false);
  const [workspacesCollapsed, setWorkspacesCollapsed] = useState(true);

  // Filter conversations based on selected workspace
  const filteredConversations = useMemo(() => {
    if (!selectedWorkspace) {
      return conversations;
    }
    return conversations.filter((conv) => conv.workspace === selectedWorkspace);
  }, [conversations, selectedWorkspace]);

  const handleNewConversation = () => {
    // Clear the conversation parameter to show WelcomeView
    navigate(route);
    // Close the sidebar
    // onToggle();
  };

  return (
    <div className="h-full">
      <div className="flex h-full flex-col">
        <Collapsible
          className="hidden"
          open={!agentsCollapsed}
          onOpenChange={(open) => setAgentsCollapsed(!open)}
        >
          <CollapsibleTrigger className="flex h-12 w-full shrink-0 items-center justify-between bg-background px-4 hover:bg-muted/50">
            <div className="flex items-center space-x-2">
              {agentsCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <h2 className="font-semibold">Agents</h2>
            </div>
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewConversation();
                        }}
                        data-testid="new-conversation-button"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!isConnected
                      ? 'Connect to create new conversations'
                      : 'Create new conversation'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden">
            <div className="overflow-hidden" style={{ maxHeight: agentsCollapsed ? 0 : '200px' }}>
              <AgentsList />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex h-12 shrink-0 items-center justify-between bg-background px-4">
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
            conversations={filteredConversations}
            selectedId$={selectedConversationId$}
            onSelect={onSelectConversation}
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={onRetry}
          />
          <Collapsible
            open={!workspacesCollapsed}
            onOpenChange={(open) => setWorkspacesCollapsed(!open)}
          >
            <CollapsibleTrigger className="flex h-12 w-full shrink-0 items-center justify-between border-t bg-background px-4 hover:bg-muted/50">
              <div className="flex items-center space-x-2">
                {workspacesCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <h2 className="font-semibold">Workspaces</h2>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div
                className="overflow-scroll"
                style={{ maxHeight: workspacesCollapsed ? 0 : '200px' }}
              >
                <WorkspaceList conversations={conversations} />
              </div>
            </CollapsibleContent>
          </Collapsible>
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
