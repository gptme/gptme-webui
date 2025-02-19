
import { type FC } from "react";
import { PanelLeftOpen, PanelLeftClose, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationList } from "./ConversationList";
import { useApi } from "@/contexts/ApiContext";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import type { ConversationItem } from "./ConversationList";
import { useQueryClient } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { ConnectionDialog } from "./sidebar/ConnectionDialog";
import { ConversationFilters } from "./sidebar/ConversationFilters";
import { SidebarFooter } from "./sidebar/SidebarFooter";

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  conversations: ConversationItem[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
  onRetry?: () => void;
}

export const LeftSidebar: FC<Props> = ({
  isOpen,
  onToggle,
  conversations,
  selectedConversationId,
  onSelectConversation,
  isLoading = false,
  isError = false,
  error,
  onRetry,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { api, isConnected } = useApi();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleNewConversation = async () => {
    try {
      const newId = Date.now().toString();
      await api.createConversation(newId, []);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "New conversation created",
        description: "Starting a fresh conversation",
      });
      navigate(`/?conversation=${newId}`);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create new conversation",
      });
    }
  };

  return (
    <div className="relative h-full">
      <div
        className={`border-r transition-all duration-300 ${
          isOpen ? "w-80" : "w-0"
        } overflow-hidden h-full flex flex-col bg-background`}
      >
        <div className="h-12 border-b flex items-center justify-between px-4">
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConnectionDialog isOpen={dialogOpen} onOpenChange={setDialogOpen} />

          <ConversationFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
            selectedWorkspace={selectedWorkspace}
            onWorkspaceChange={setSelectedWorkspace}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />

          <div className="border-t">
            <div className="flex items-center justify-between px-4 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">Conversations</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNewConversation}
                      disabled={!isConnected}
                      className="h-6 w-6"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!isConnected
                      ? "Connect to create new conversations"
                      : "Create new conversation"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-24rem)]">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId}
                onSelect={onSelectConversation}
                isLoading={isLoading}
                isError={isError}
                error={error}
                onRetry={onRetry}
              />
            </div>
          </div>

          <SidebarFooter />
        </div>
      </div>
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute top-2 -right-10 z-50"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
