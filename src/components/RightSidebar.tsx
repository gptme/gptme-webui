import { PanelRightOpen, PanelRightClose, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface Props {
  isOpen: boolean;
  onToggle: () => void;
}

import type { FC } from "react";

const VNC_URL = "http://localhost:6080/vnc.html";

export const RightSidebar: FC<Props> = ({ isOpen, onToggle }) => {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <div className="relative h-full">
      <div
        className={`border-l transition-all duration-300 ${
          isOpen ? (activeTab === "computer" ? "w-[48rem]" : "w-[32rem]") : "w-0"
        } overflow-hidden h-full`}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="h-12 border-b flex items-center justify-between px-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="computer">
                <Monitor className="h-4 w-4 mr-2" />
                Computer
              </TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon" onClick={onToggle} className="ml-2">
              <PanelRightClose className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="h-[calc(100%-3rem)] overflow-hidden">
            <TabsContent value="details" className="p-4 m-0 h-full">
              <div className="text-sm text-muted-foreground">
                Select a file or tool to view details
              </div>
            </TabsContent>
            
            <TabsContent value="computer" className="p-0 m-0 h-full">
              <iframe
                src={VNC_URL}
                className="w-full h-full border-0"
                allow="clipboard-read; clipboard-write"
                title="VNC Viewer"
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute top-2 -left-10"
        >
          <PanelRightOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}