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
import { ExamplesSection } from '@/components/ExamplesSection';

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
      // Create conversation with immediate placeholder and get ID
      const conversationId = await api.createConversationWithPlaceholder(message, {
        model: options?.model,
        stream: options?.stream,
        workspace: options?.workspace || '.',
      });

      // Navigate immediately - stepping will be triggered automatically by the API
      navigate(`/chat/${conversationId}`);

      // Invalidate conversations query to refresh the list
      await queryClient.invalidateQueries({
        queryKey: ['conversations', connectionConfig.baseUrl, isConnected$.get()],
      });

      toast.success('Conversation started successfully!');
    } catch (error) {
      console.error('Failed to create conversation:', error);

      // Parse error message and provide specific user feedback
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lowerMessage = errorMessage.toLowerCase();

      if (
        lowerMessage.includes('duplicate') ||
        lowerMessage.includes('already exists') ||
        lowerMessage.includes('conflict')
      ) {
        toast.error(
          'A conversation with this name already exists. Please try a different starting message.',
          {
            duration: 5000,
          }
        );
      } else if (
        lowerMessage.includes('network') ||
        lowerMessage.includes('fetch') ||
        error instanceof TypeError
      ) {
        toast.error('Unable to connect to server. Please check your connection and try again.', {
          duration: 5000,
        });
      } else if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
        toast.error('Authentication failed. Please check your credentials.', {
          duration: 5000,
        });
      } else {
        toast.error(`Failed to create conversation: ${errorMessage}`, {
          duration: 5000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">How can I help you today?</h1>
        <p className="mt-2 text-muted-foreground">
          I can help you write code, debug issues, and learn new concepts.
        </p>
      </div>

      <div className="my-4 w-full max-w-xl px-4">
        <ChatInput
          onSend={handleSend}
          autoFocus$={autoFocus$}
          hasSession$={hasSession$}
          value={inputValue}
          onChange={setInputValue}
        />
      </div>

      <div>
        <div className="flex justify-center space-x-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleHistory}
            className="text-muted-foreground"
          >
            <History className="mr-2 h-4 w-4" />
            Show history
          </Button>
          <ExamplesSection onExampleSelect={setInputValue} disabled={isSubmitting} />
        </div>
      </div>
    </div>
  );
};
