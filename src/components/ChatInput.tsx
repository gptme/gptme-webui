
import { Send, Loader2, Image, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, type FC, type FormEvent, type KeyboardEvent } from "react";
import { useApi } from "@/contexts/ApiContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  onSend: (message: string) => void;
  onInterrupt?: () => void;
  isReadOnly?: boolean;
  isGenerating?: boolean;
}

export const ChatInput: FC<Props> = ({
  onSend,
  onInterrupt,
  isReadOnly,
  isGenerating,
}) => {
  const [message, setMessage] = useState("");
  const api = useApi();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isGenerating && onInterrupt) {
      console.log("[ChatInput] Interrupting generation...", { isGenerating });
      try {
        await onInterrupt();
        console.log("[ChatInput] Generation interrupted successfully", { isGenerating });
      } catch (error) {
        console.error("[ChatInput] Error interrupting generation:", error);
      }
    } else if (message.trim()) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const placeholder = isReadOnly
    ? "This is a demo conversation (read-only)"
    : api.isConnected
    ? "Send a message..."
    : "Connect to gptme to send messages";

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isGenerating ? "Generating response..." : placeholder}
              className="min-h-[60px] pr-24 bg-secondary/50 border-0 focus-visible:ring-0 resize-none"
              disabled={!api.isConnected || isReadOnly || isGenerating}
            />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                      disabled={!api.isConnected || isReadOnly}
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Image upload coming soon!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                      disabled={!api.isConnected || isReadOnly}
                      // TODO: Implement model selector panel once we have an API to fetch available models
                      onClick={() => console.log("Model selector panel - coming soon")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Model settings (coming soon)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <Button
            type="submit"
            className="h-[60px] px-4 bg-green-600 hover:bg-green-700 rounded-lg shrink-0"
            disabled={!api.isConnected || isReadOnly}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <span>Stop</span>
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
