import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/contexts/ApiContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { use$ } from '@legendapp/state/react';
import { observable } from '@legendapp/state';
import { ChatInput, type ChatOptions } from '@/components/ChatInput';
import { History } from 'lucide-react';

const examples = [
  'Write a Python script',
  'Debug this error',
  'Explore my project',
  'Generate tests',
];

export const WelcomeView = ({ onToggleHistory }: { onToggleHistory: () => void }) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { api, isConnected$, connectionConfig } = useApi();
  const queryClient = useQueryClient();
  const isConnected = use$(isConnected$);

  // Create observables that ChatInput expects
  const autoFocus$ = observable(true);
  const hasSession$ = observable(true); // Always true for welcome view

  const handleSend = async (message: string, options?: ChatOptions) => {
    if (!message.trim() || !isConnected) return;

    setIsSubmitting(true);
    try {
      // Create a new conversation with a timestamp-based ID
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const conversationId = `chat-${timestamp}`;

      // Create the conversation with the initial message and config
      await api.createConversation(conversationId, [{ role: 'user', content: message }], {
        model: options?.model,
        stream: options?.stream,
      });

      // Navigate to the new conversation with step flag
      navigate(`/?conversation=${conversationId}&step=true`);

      // Invalidate conversations query to refresh the list
      await queryClient.invalidateQueries({
        queryKey: ['conversations', connectionConfig.baseUrl, isConnected$.get()],
      });

      // Show success message
      toast.success('Conversation started successfully!');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold">How can I help you today?</h1>
          <p className="mt-2 text-muted-foreground">
            I can help you write code, debug issues, and learn new concepts.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <ChatInput
              onSend={handleSend}
              autoFocus$={autoFocus$}
              hasSession$={hasSession$}
              value={inputValue}
              onChange={setInputValue}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-center text-sm text-muted-foreground">
            Here are some examples to get you started:
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {examples.map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                className="h-10 text-xs hover:bg-muted/50"
                onClick={() => setInputValue(example)}
                disabled={isSubmitting}
              >
                {example}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleHistory}
            className="text-muted-foreground"
          >
            <History className="mr-2 h-4 w-4" />
            Show history
          </Button>
        </div>
      </div>
    </div>
  );
};
