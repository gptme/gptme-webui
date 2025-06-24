import { type FC } from 'react';
import { Folder } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPath } from '@/utils/workspaceUtils';
import type { WorkspaceProject } from '@/utils/workspaceUtils';

interface Props {
  label?: string;
  selectedWorkspace: string;
  onWorkspaceChange: (workspace: string) => void;
  workspaces: WorkspaceProject[];
  disabled?: boolean;
  placeholder?: string;
  showCurrentDirectory?: boolean;
  showConversationCount?: boolean;
  className?: string;
}

export const WorkspaceSelector: FC<Props> = ({
  label = 'Workspace',
  selectedWorkspace,
  onWorkspaceChange,
  workspaces,
  disabled = false,
  placeholder = 'Current directory (.)',
  showCurrentDirectory = true,
  showConversationCount = false,
  className,
}) => {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      {label && <Label htmlFor="workspace-select">{label}</Label>}
      <Select value={selectedWorkspace} onValueChange={onWorkspaceChange} disabled={disabled}>
        <SelectTrigger id="workspace-select">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showCurrentDirectory && <SelectItem value=".">Current directory (.)</SelectItem>}
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.path} value={workspace.path}>
              <div className="flex items-center space-x-2">
                <Folder className="h-4 w-4 text-yellow-600" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-left text-sm font-medium">{workspace.name}</span>
                    {showConversationCount && (
                      <span className="text-xs text-muted-foreground">
                        ({workspace.conversationCount})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatPath(workspace.path)}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
