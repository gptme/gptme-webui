import { PanelRightOpen, PanelRightClose, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
}

import type { FC } from 'react';

const VNC_URL = 'http://localhost:6080/vnc.html';

export const RightSidebar: FC<Props> = ({ isOpen, onToggle }) => {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <div className="relative h-full">
      <div
        className={`border-l transition-all duration-300 ${
          isOpen ? (activeTab === 'computer' ? 'w-[48rem]' : 'w-[32rem]') : 'w-0'
        } h-full overflow-hidden`}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <div className="flex h-12 items-center justify-between border-b px-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="computer">
                <Monitor className="mr-2 h-4 w-4" />
                Computer
              </TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon" onClick={onToggle} className="ml-2">
              <PanelRightClose className="h-5 w-5" />
            </Button>
          </div>

          <div className="h-[calc(100%-3rem)] overflow-hidden">
            <TabsContent value="details" className="m-0 h-full p-4">
              <div className="text-sm text-muted-foreground">
                Select a file or tool to view details
              </div>
            </TabsContent>

            <TabsContent value="computer" className="m-0 h-full p-0">
              <iframe
                src={VNC_URL}
                className="h-full w-full border-0"
                allow="clipboard-read; clipboard-write"
                title="VNC Viewer"
              />
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
