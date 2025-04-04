import { Send, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useRef, type FC, type FormEvent, type KeyboardEvent } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { type Observable } from '@legendapp/state';
import { Computed, use$, useObserveEffect } from '@legendapp/state/react';

export interface ChatOptions {
  model?: string;
  stream?: boolean;
}

interface Props {
  onSend: (message: string, options?: ChatOptions) => void;
  onInterrupt?: () => void;
  isReadOnly?: boolean;
  isGenerating$: Observable<boolean>;
  defaultModel?: string;
  availableModels?: string[];
  autoFocus?: boolean;
}

export const ChatInput: FC<Props> = ({
  onSend,
  onInterrupt,
  isReadOnly,
  isGenerating$,
  defaultModel = '',
  availableModels = [],
  autoFocus = false,
}) => {
  const [message, setMessage] = useState('');
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState(defaultModel || '');
  const { isConnected$ } = useApi();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isConnected = use$(isConnected$);
  const isDisabled = isReadOnly || !isConnected;

  // Focus the textarea when autoFocus is true and component is interactive
  useEffect(() => {
    if (autoFocus && textareaRef.current && !isReadOnly && isConnected) {
      textareaRef.current.focus();
    }
  }, [autoFocus, isReadOnly, isConnected]);

  // Global keyboard shortcut for interrupting generation with Escape key
  useObserveEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isGenerating$.get() && onInterrupt) {
        console.log('[ChatInput] Global Escape pressed, interrupting generation...');
        onInterrupt();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isGenerating$.get() && onInterrupt) {
      console.log('[ChatInput] Interrupting generation...', { isGenerating: isGenerating$.get() });
      try {
        await onInterrupt();
        console.log('[ChatInput] Generation interrupted successfully', {
          isGenerating: isGenerating$.get(),
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
    } else if (e.key === 'Escape' && isGenerating$.get() && onInterrupt) {
      e.preventDefault();
      console.log('[ChatInput] Escape pressed, interrupting generation...');
      onInterrupt();
    }
  };

  const placeholder = isReadOnly
    ? 'This is a demo conversation (read-only)'
    : isConnected
      ? 'Send a message...'
      : 'Connect to gptme to send messages';

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="mx-auto flex max-w-2xl flex-col">
        <div className="flex">
          <div className="flex flex-1">
            <div className="relative flex flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  // Auto-adjust height
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 400)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="max-h-[400px] min-h-[60px] resize-none overflow-y-auto pb-8 pr-16"
                disabled={isDisabled}
              />
              <div className="absolute bottom-1.5 left-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 rounded-sm px-1.5 text-[10px] text-muted-foreground transition-all hover:bg-accent hover:text-muted-foreground hover:opacity-100"
                      disabled={isDisabled}
                    >
                      <Settings className="mr-0.5 h-2.5 w-2.5" />
                      Options
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-8">
                      <div className="space-y-1">
                        <Label htmlFor="model-select">Model</Label>
                        <Select
                          value={selectedModel}
                          onValueChange={setSelectedModel}
                          disabled={isDisabled}
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

                      <div className="flex items-center justify-between">
                        <Label htmlFor="streaming-toggle">Enable streaming</Label>
                        <Switch
                          id="streaming-toggle"
                          checked={streamingEnabled}
                          onCheckedChange={setStreamingEnabled}
                          disabled={isDisabled}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="relative h-full">
              <Computed>
                {() => {
                  return (
                    <Button
                      type="submit"
                      className={`absolute bottom-2 right-2 rounded-full p-1 transition-colors
                  ${
                    isGenerating$.get()
                      ? 'animate-[pulse_1s_ease-in-out_infinite] bg-red-600 p-3 hover:bg-red-700'
                      : 'h-10 w-10 bg-green-600 text-green-100'
                  }
                `}
                      disabled={isDisabled}
                    >
                      {isGenerating$.get() ? (
                        <div className="flex items-center gap-2">
                          <span>Stop</span>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  );
                }}
              </Computed>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
