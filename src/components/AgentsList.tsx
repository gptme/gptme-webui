import { Bot, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getExampleAgents, type Agent } from '@/utils/workspaceUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FC } from 'react';

interface AgentsListProps {
  onSelectAgent?: (agent: Agent) => void;
}

export const AgentsList: FC<AgentsListProps> = ({ onSelectAgent }) => {
  const agents = getExampleAgents();

  const handleSelectAgent = (agent: Agent) => {
    // For now, just log the selection
    console.log('Selected agent:', agent);
    onSelectAgent?.(agent);
  };

  const handleCreateAgent = () => {
    // TODO: Implement agent creation
    console.log('Create agent');
  };

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground">
        <Bot className="mb-2 h-8 w-8 opacity-50" />
        <p>No agents yet</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleCreateAgent} className="mt-2">
              <Plus className="mr-1 h-4 w-4" />
              Create Agent
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create a specialized agent with custom context</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1 p-2">
      {agents.map((agent) => (
        <Button
          key={agent.path}
          variant="ghost"
          className="h-auto flex-col items-start justify-start p-2 text-left"
          onClick={() => handleSelectAgent(agent)}
        >
          <div className="flex w-full items-center space-x-2">
            <Bot className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{agent.name}</span>
          </div>
          {agent.description && (
            <p className="mt-1 text-xs text-muted-foreground">{agent.description}</p>
          )}
        </Button>
      ))}
    </div>
  );
};
