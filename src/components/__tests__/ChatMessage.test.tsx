import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import '@testing-library/jest-dom';
import type { Message } from '@/types/conversation';
import { observable } from '@legendapp/state';
import { SettingsProvider } from '@/contexts/SettingsContext';

// Mock the ApiContext
jest.mock('@/contexts/ApiContext', () => ({
  useApi: () => ({
    baseUrl: 'http://localhost:5700',
    connectionConfig: {
      apiKey: '',
      baseUrl: 'http://localhost:5700',
    },
  }),
}));

describe('ChatMessage', () => {
  const testConversationId = 'test-conversation';

  // Helper function to render with providers
  const renderWithProviders = (component: React.ReactElement) => {
    return render(<SettingsProvider>{component}</SettingsProvider>);
  };

  it('renders user message', () => {
    const message: Message = {
      role: 'user',
      content: 'Hello!',
      timestamp: new Date().toISOString(),
    };
    const message$ = observable<Message>(message);
    const log$ = observable<Message[]>([message]);

    renderWithProviders(
      <ChatMessage
        message$={message$}
        log$={log$}
        currentIndex={0}
        conversationId={testConversationId}
      />
    );
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('renders assistant message', () => {
    const message: Message = {
      role: 'assistant',
      content: 'Hi there!',
      timestamp: new Date().toISOString(),
    };
    const message$ = observable<Message>(message);
    const log$ = observable<Message[]>([message]);

    renderWithProviders(
      <ChatMessage
        message$={message$}
        log$={log$}
        currentIndex={0}
        conversationId={testConversationId}
      />
    );
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('renders system message with monospace font', () => {
    const message: Message = {
      role: 'system',
      content: 'System message',
      timestamp: new Date().toISOString(),
    };
    const message$ = observable<Message>(message);
    const log$ = observable<Message[]>([message]);

    const { container } = renderWithProviders(
      <ChatMessage
        message$={message$}
        log$={log$}
        currentIndex={0}
        conversationId={testConversationId}
      />
    );
    const messageElement = container.querySelector('.font-mono');
    expect(messageElement).toBeInTheDocument();
  });
});
