import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import '@testing-library/jest-dom';
import type { Message } from '@/types/conversation';
import { observable } from '@legendapp/state';

// Mock the ApiContext
jest.mock('@/contexts/ApiContext', () => ({
  useApi: () => ({
    baseUrl: 'http://localhost:5000',
  }),
}));

describe('ChatMessage', () => {
  const testConversationId = 'test-conversation';

  it('renders user message', () => {
    const message$ = observable<Message>({
      role: 'user',
      content: 'Hello!',
      timestamp: new Date().toISOString(),
    });

    render(<ChatMessage message$={message$} conversationId={testConversationId} />);
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('renders assistant message', () => {
    const message$ = observable<Message>({
      role: 'assistant',
      content: 'Hi there!',
      timestamp: new Date().toISOString(),
    });

    render(<ChatMessage message$={message$} conversationId={testConversationId} />);
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('renders system message with monospace font', () => {
    const message$ = observable<Message>({
      role: 'system',
      content: 'System message',
      timestamp: new Date().toISOString(),
    });

    const { container } = render(
      <ChatMessage message$={message$} conversationId={testConversationId} />
    );
    const messageElement = container.querySelector('.font-mono');
    expect(messageElement).toBeInTheDocument();
  });
});
