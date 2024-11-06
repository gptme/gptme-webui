import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, type FC, type FormEvent, type KeyboardEvent } from "react";
import { useApi } from "@/contexts/ApiContext";

interface Props {
  onSend: (message: string) => void;
  onInterrupt?: () => void;
  isReadOnly?: boolean;
  isSending?: boolean;
}

export const ChatInput: FC<Props> = ({
  onSend,
  onInterrupt,
  isReadOnly,
  isSending,
}) => {
  const [message, setMessage] = useState("");
  const api = useApi();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSending && onInterrupt) {
      console.log("Interrupting generation...");
      await onInterrupt();
      console.log("Generation interrupted");
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
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="max-w-3xl mx-auto flex">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isSending ? "Sending message..." : placeholder}
          className="min-h-[60px] rounded-r-none"
          disabled={!api.isConnected || isReadOnly || isSending}
        />
        <Button
          type="submit"
          className="min-h-[60px] min-w-[60px] bg-green-600 hover:bg-green-700 rounded-l-none rounded-r-lg"
          disabled={!api.isConnected || isReadOnly}
        >
          {isSending ? (
            <div className="flex items-center gap-2">
              <span>Stop</span>
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </form>
  );
};
