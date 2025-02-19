
import { type FC } from "react";
import { PanelLeftOpen, PanelLeftClose, Plus, ExternalLink, Network } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

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
  const { api, isConnected, baseUrl, setBaseUrl } = useApi();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState(baseUrl);

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

  const handleConnect = async () => {
    try {
      await setBaseUrl(url);
      toast({
        title: "Connected",
        description: "Successfully connected to gptme instance",
      });
      setDialogOpen(false);
    } catch (error) {
      let errorMessage = "Could not connect to gptme instance.";
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('CORS')) {
          errorMessage += " CORS issue detected - ensure the server has CORS enabled and is accepting requests from " + window.location.origin;
        } else {
          errorMessage += " Error: " + error.message;
        }
      }
      console.error("Connection error:", error);
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: errorMessage,
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
          <h2 className="font-semibold">Menu</h2>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Connection Status Button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button 
                className={`flex items-center px-4 py-3 w-full hover:bg-accent transition-colors ${
                  isConnected ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                <Network className="w-4 h-4 mr-3" />
                <span className="flex-1 text-left">
                  {isConnected ? "Connected" : "Connect to gptme"}
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Connect to gptme</DialogTitle>
                <DialogDescription>
                  Connect to a gptme instance to enable advanced features and AI interactions.
                  See the <a href="https://gptme.org/docs/server.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">server documentation</a> for more details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label htmlFor="url" className="text-sm font-medium">Server URL</label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="http://127.0.0.1:5000"
                  />
                </div>
                <Button onClick={handleConnect} className="w-full">
                  {isConnected ? "Reconnect" : "Connect"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Conversations Section */}
          <div className="px-4 py-3 border-t">
            <div className="flex items-center justify-between mb-2">
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

          {/* Footer Links */}
          <div className="mt-auto border-t p-2 text-xs text-muted-foreground">
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
          className="absolute top-2 -right-10 z-50"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
