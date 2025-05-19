import { Monitor, Settings, Globe, FolderOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import type { FC } from 'react';

interface Props {
  conversationId: string;
}
import { ConversationSettings } from './ConversationSettings';
import { BrowserPreview } from './BrowserPreview';
import { WorkspaceExplorer } from './workspace/WorkspaceExplorer';

const VNC_URL = 'http://localhost:6080/vnc.html';

export const RightSidebar: FC<Props> = ({ conversationId }) => {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="h-full">
      <div className="h-full">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="relative flex h-full flex-col"
        >
          <div className="absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-between border-b bg-background px-4">
            <TabsList>
              <TabsTrigger value="workspace">
                <FolderOpen className="mr-2 h-4 w-4" />
                Workspace
              </TabsTrigger>
              <TabsTrigger value="browser">
                <Globe className="mr-2 h-4 w-4" />
                Browser
              </TabsTrigger>
              <TabsTrigger value="computer">
                <Monitor className="mr-2 h-4 w-4" />
                Computer
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="settings" className="absolute inset-0 mt-12 overflow-auto px-4">
              <ConversationSettings conversationId={conversationId} />
            </TabsContent>

            <TabsContent value="workspace" className="absolute inset-0 mt-12 overflow-auto">
              <WorkspaceExplorer conversationId={conversationId} />
            </TabsContent>

            <TabsContent value="computer" className="absolute inset-0 mt-12">
              <iframe
                src={VNC_URL}
                className="h-full w-full rounded-md border-0"
                allow="clipboard-read; clipboard-write"
                title="VNC Viewer"
              />
            </TabsContent>

            <TabsContent value="browser" className="absolute inset-0 mt-12">
              <BrowserPreview />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
