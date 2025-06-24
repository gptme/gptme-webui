import { type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MenuBar } from '@/components/MenuBar';
import { WorkspaceExplorer } from '@/components/workspace/WorkspaceExplorer';

const Workspace: FC = () => {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');

  if (!conversationId) {
    return (
      <div className="flex h-screen flex-col">
        <MenuBar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold">Workspace</h1>
            <p className="mb-4 text-muted-foreground">
              No conversation ID provided. Please specify a conversation ID in the URL.
            </p>
            <p className="text-sm text-muted-foreground">
              Example: /workspace?conversation=your-conversation-id
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <MenuBar />
      <div className="flex-1 overflow-hidden">
        <WorkspaceExplorer conversationId={conversationId} />
      </div>
    </div>
  );
};

export default Workspace;
