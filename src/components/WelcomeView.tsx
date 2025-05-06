import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/contexts/ApiContext';
import { toast } from 'sonner';

const examples = [
  'Help me write a Python script',
  'Debug my code',
  'Explain a programming concept',
  'Help me with git',
];

export const WelcomeView = ({ onToggleHistory }: { onToggleHistory: () => void }) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { api, isConnected$ } = useApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected$.get()) return;

    setIsSubmitting(true);
    try {
      // Create a new conversation with a timestamp-based ID
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const conversationId = `chat-${timestamp}`;

      await api.createConversation(conversationId, [{ role: 'user', content: input }]);

      // Subscribe to events for the new conversation
      api.subscribeToEvents(conversationId, {
        onMessageStart: () => {},
        onToken: () => {},
        onMessageComplete: () => {},
        onMessageAdded: () => {},
        onToolPending: () => {},
        onInterrupted: () => {},
        onError: (error) => {
          toast.error(`Error: ${error}`);
        },
      });

      // Send the initial message
      await api.sendMessage(conversationId, {
        role: 'user',
        content: input,
      });

      // Start generation
      await api.step(conversationId);

      // Navigate to the new conversation
      navigate(`/?conversation=${conversationId}`);
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="h-12 text-lg"
            disabled={isSubmitting || !isConnected$.get()}
          />
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onToggleHistory}
              className="text-muted-foreground"
            >
              Show history
            </Button>
            <Button type="submit" disabled={!input.trim() || isSubmitting || !isConnected$.get()}>
              {isSubmitting ? 'Sending...' : 'Send message'}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <h2 className="text-center text-sm text-muted-foreground">
            Here are some examples to get you started:
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {examples.map((example) => (
              <Button
                key={example}
                variant="outline"
                className="h-auto whitespace-normal p-4 text-left"
                onClick={() => setInput(example)}
                disabled={isSubmitting}
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
