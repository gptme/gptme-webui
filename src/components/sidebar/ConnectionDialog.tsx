
import { FC } from "react";
import { Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useApi } from "@/contexts/ApiContext";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConnectionDialog: FC<Props> = ({ isOpen, onOpenChange }) => {
  const { isConnected, baseUrl, setBaseUrl } = useApi();
  const { toast } = useToast();
  const [url, setUrl] = useState(baseUrl);

  const handleConnect = async () => {
    try {
      await setBaseUrl(url);
      toast({
        title: "Connected",
        description: "Successfully connected to gptme instance",
      });
      onOpenChange(false);
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
  );
};
