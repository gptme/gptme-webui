import {
  PanelRightOpen,
  PanelRightClose,
  Monitor,
  Settings,
  Globe,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface Props {
  isOpen$: Observable<boolean>;
  onToggle: () => void;
  conversationId: string;
}

import type { FC } from 'react';
import { type Observable } from '@legendapp/state';
import { use$ } from '@legendapp/state/react';
import { ConversationSettings } from './ConversationSettings';
import { BrowserPreview } from './BrowserPreview';
import { WorkspaceExplorer } from './workspace/WorkspaceExplorer';

const VNC_URL = 'http://localhost:6080/vnc.html';

export const RightSidebar: FC<Props> = ({ isOpen$, onToggle, conversationId }) => {
  const [activeTab, setActiveTab] = useState('settings');
  const isOpen = use$(isOpen$);

  return (
    <div className="relative h-full">
      <div
        className={`border-l transition-all duration-300 ${
          isOpen
            ? activeTab === 'computer' || activeTab === 'browser' || activeTab === 'workspace'
              ? 'w-[48rem]'
              : 'w-[32rem]'
            : 'w-0'
        } h-full overflow-hidden`}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <div className="flex h-12 items-center justify-between border-b px-4">
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
            <Button variant="ghost" size="icon" onClick={onToggle} className="ml-2">
              <PanelRightClose className="h-5 w-5" />
            </Button>
          </div>

          <div className="h-[calc(100%-3rem)]">
            <TabsContent value="settings" className="m-0 h-full p-4">
              <ConversationSettings conversationId={conversationId} />
            </TabsContent>

            <TabsContent value="workspace" className="m-0 h-full">
              <WorkspaceExplorer conversationId={conversationId} />
            </TabsContent>

            <TabsContent value="computer" className="m-0 h-full p-0">
              <iframe
                src={VNC_URL}
                className="h-full w-full rounded-md border-0 p-1"
                allow="clipboard-read; clipboard-write"
                title="VNC Viewer"
              />
            </TabsContent>

            <TabsContent value="browser" className="m-0 h-full p-0">
              <BrowserPreview />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {!isOpen && (
        <Button variant="ghost" size="icon" onClick={onToggle} className="absolute -left-10 top-2">
          <PanelRightOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
