import { useState } from "react";
import type { FC } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { Network, Check, Copy } from "lucide-react";
import { useApi } from "@/contexts/ApiContext";
import { cn } from "@/lib/utils";

export const ConnectionButton: FC = () => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { baseUrl, setBaseUrl, isConnected } = useApi();
  const [url, setUrl] = useState(baseUrl);

  const features = [
    "Create new conversations",
    "Access conversation history",
    "Generate AI responses"
  ];

  const serverCommand = `gptme-server --cors-origin='${window.location.origin}'`;

  const copyCommand = () => {
    navigator.clipboard.writeText(serverCommand);
    toast({
      title: "Copied",
      description: "Command copied to clipboard",
    });
  };

  const handleConnect = async () => {
    try {
      await setBaseUrl(url);
      toast({
        title: "Connected",
        description: "Successfully connected to gptme instance",
      });
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={isConnected ? "text-green-600" : "text-muted-foreground"}
        >
          <Network className="w-4 h-4 mr-2" />
          {isConnected ? "Connected" : "Connect"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to gptme</DialogTitle>
          <DialogDescription>
            Connect to a gptme instance to enable advanced features and AI interactions.
            See the <a href="https://gptme.org/docs/server.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">server documentation</a> for more details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">Server URL</label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://127.0.0.1:5000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Start the server with:</label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <code className="flex-1 text-sm">{serverCommand}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyCommand}
                className="h-8 w-8"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Features enabled by connecting:</h4>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <Check className={cn(
                    "w-4 h-4 mr-2",
                    isConnected ? "text-green-500" : "text-gray-300"
                  )} />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button 
            onClick={handleConnect} 
            className={cn(
              "w-full",
              isConnected && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isConnected ? "Reconnect" : "Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};