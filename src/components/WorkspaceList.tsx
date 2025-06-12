import { Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  extractWorkspacesFromConversations,
  formatPath,
  type WorkspaceProject,
} from '@/utils/workspaceUtils';
import { formatDistanceToNow } from 'date-fns';
import type { ConversationItem } from './ConversationList';
import type { FC } from 'react';

interface WorkspaceListProps {
  conversations: ConversationItem[];
  onSelectWorkspace?: (workspace: WorkspaceProject) => void;
}

export const WorkspaceList: FC<WorkspaceListProps> = ({ conversations, onSelectWorkspace }) => {
  const workspaces = extractWorkspacesFromConversations(conversations);

  const handleSelectWorkspace = (workspace: WorkspaceProject) => {
    // For now, just log the selection
    console.log('Selected workspace:', workspace);
    onSelectWorkspace?.(workspace);
  };

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground">
        <Folder className="mb-2 h-8 w-8 opacity-50" />
        <p>No workspaces yet</p>
        <p className="text-xs">Workspaces appear when you create conversations</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1 p-2">
      {workspaces.map((workspace) => (
        <Button
          key={workspace.path}
          variant="ghost"
          className="h-auto flex-col items-start justify-start p-2 text-left"
          onClick={() => handleSelectWorkspace(workspace)}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center space-x-2">
              <Folder className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">{workspace.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">{workspace.conversationCount}</span>
          </div>
          <div className="mt-1 flex w-full items-center justify-between">
            <p className="truncate text-xs text-muted-foreground">{formatPath(workspace.path)}</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(workspace.lastUsed), { addSuffix: true })}
            </span>
          </div>
        </Button>
      ))}
    </div>
  );
};
