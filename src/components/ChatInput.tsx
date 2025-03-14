import { Send, Loader2, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, type FC, type FormEvent, type KeyboardEvent } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface ChatOptions {
  model?: string;
  stream?: boolean;
}

interface Props {
  onSend: (message: string, options?: ChatOptions) => void;
  onInterrupt?: () => void;
  isReadOnly?: boolean;
  isGenerating?: boolean;
  defaultModel?: string;
  availableModels?: string[];
}

export const ChatInput: FC<Props> = ({
  onSend,
  onInterrupt,
  isReadOnly,
  isGenerating,
  defaultModel = '',
  availableModels = [],
}) => {
  const [message, setMessage] = useState('');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState(defaultModel || '');
  const api = useApi();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isGenerating && onInterrupt) {
      console.log('[ChatInput] Interrupting generation...', { isGenerating });
      try {
        await onInterrupt();
        console.log('[ChatInput] Generation interrupted successfully', {
          isGenerating,
        });
      } catch (error) {
        console.error('[ChatInput] Error interrupting generation:', error);
      }
    } else if (message.trim()) {
      onSend(message, {
        model: selectedModel === 'default' ? undefined : selectedModel,
        stream: streamingEnabled,
      });
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const placeholder = isReadOnly
    ? 'This is a demo conversation (read-only)'
    : api.isConnected
      ? 'Send a message...'
      : 'Connect to gptme to send messages';

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="mx-auto flex max-w-3xl flex-col">
        <div className="flex">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isGenerating ? 'Generating response...' : placeholder}
            className="min-h-[60px] rounded-r-none"
            disabled={!api.isConnected || isReadOnly || isGenerating}
          />
          <Button
            type="submit"
            className="min-h-[60px] min-w-[60px] rounded-l-none rounded-r-lg bg-green-600 hover:bg-green-700"
            disabled={!api.isConnected || isReadOnly}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <span>Stop</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Collapsible open={isOptionsOpen} onOpenChange={setIsOptionsOpen} className="mt-2">
          <div className="flex justify-center">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <Settings className="h-3 w-3" />
                Options
                {isOptionsOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-2 space-y-4 rounded-md border p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model-select">Model</Label>
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={!api.isConnected || isReadOnly}
                >
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Default model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default model</SelectItem>
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end space-x-2">
                <Label htmlFor="streaming-toggle" className="flex-grow">
                  Enable streaming
                </Label>
                <Switch
                  id="streaming-toggle"
                  checked={streamingEnabled}
                  onCheckedChange={setStreamingEnabled}
                  disabled={!api.isConnected || isReadOnly}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </form>
  );
};
