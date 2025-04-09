import { screen, act } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import '@testing-library/jest-dom';
import type { Message } from '@/types/conversation';
import { observable } from '@legendapp/state';
import { renderWithProviders, isServerRunning } from '@/test/test-utils';

describe('ChatMessage', () => {
  const testConversationId = 'test-conversation';

  beforeEach(async () => {
    const serverRunning = await isServerRunning();
    if (!serverRunning) {
      console.warn('Skipping tests: gptme-server not running on localhost:5700');
      return;
    }
  });

  it('renders user message', async () => {
    const message$ = observable<Message>({
      role: 'user',
      content: 'Hello!',
      timestamp: new Date().toISOString(),
    });

    await act(async () => {
      await renderWithProviders(
        <ChatMessage message$={message$} conversationId={testConversationId} />
      );
    });

    await act(async () => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });
  });

  it('renders assistant message', async () => {
    const message$ = observable<Message>({
      role: 'assistant',
      content: 'Hi there!',
      timestamp: new Date().toISOString(),
    });

    await act(async () => {
      await renderWithProviders(
        <ChatMessage message$={message$} conversationId={testConversationId} />
      );
    });

    await act(async () => {
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
  });

  it('renders system message with monospace font', async () => {
    const message$ = observable<Message>({
      role: 'system',
      content: 'System message',
      timestamp: new Date().toISOString(),
    });

    let container: HTMLElement;
    await act(async () => {
      const result = await renderWithProviders(
        <ChatMessage message$={message$} conversationId={testConversationId} />
      );
      container = result.container;
    });

    await act(async () => {
      const messageElement = container.querySelector('.font-mono');
      expect(messageElement).toBeInTheDocument();
    });
  });
});
