import { PanelLeftOpen, PanelLeftClose, Plus, ExternalLink } from "lucide-react";
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

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  conversations: ConversationItem[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

import type { FC } from "react";

export const LeftSidebar: FC<Props> = ({
  isOpen,
  onToggle,
  conversations,
  selectedConversationId,
  onSelectConversation,
}) => {
  const api = useApi();
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
        } overflow-hidden h-full flex flex-col`}
      >
        <div className="h-12 border-b flex items-center justify-between px-4">
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
                      disabled={!api.isConnected}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {!api.isConnected
                    ? "Connect to create new conversations"
                    : "Create new conversation"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={onSelectConversation}
          />
          <div className="border-t p-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-center space-x-4">
              <a
                href="https://github.com/ErikBjare/gptme"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:text-foreground"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                gptme
              </a>
              <a
                href="https://github.com/ErikBjare/gptme-webui"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:text-foreground"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                gptme-webui
              </a>
            </div>
          </div>
        </div>
      </div>
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute top-2 -right-10"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};