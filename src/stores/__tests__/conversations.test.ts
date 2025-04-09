import { store$, createConversationStore, initConversation } from '../conversations';
import type { Message } from '@/types/conversation';
import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('conversations store', () => {
  beforeEach(() => {
    // Clear the store before each test
    store$.conversations.set(new Map());
  });

  describe('basic operations', () => {
    test('can add a conversation', () => {
      // TODO
    });

    test('can update conversation fields', () => {
      // TODO
    });

    test('store is reactive to Map changes', () => {
      // TODO
    });
  });

  describe('conversation values', () => {
    test('readonly is observable', () => {
      const conv$ = createConversationStore('test');
      store$.conversations.set('test', conv$);

      const onChange = vi.fn();
      store$.conversations.onChange(onChange);

      // Should be able to get/set via observable methods
      expect(store$.conversations.peek().get('test')?.readonly).toBe(false);

      store$.conversations.peek().get('test')?.setReadonly(true);

      expect(onChange).toHaveBeenCalled();
      expect(store$.conversations.peek().get('test')?.readonly).toBe(true);
    });
  });

  describe('actions', () => {
    test('updateConversation updates fields correctly', () => {
      // Initialize conversation
      initConversation('test');

      // Setup change detection
      const onChange = vi.fn();
      store$.conversations.onChange(onChange);

      // Update fields
      const conversation$ = store$.conversations.get().get('test')!;
      conversation$.setGenerating(true);
      conversation$.setReadonly(true);

      // Get the updated state
      const conv = store$.conversations.peek().get('test');
      expect(conv).toBeDefined();
      expect(conv?.isGenerating.get()).toBe(true);
      expect(conv?.readonly.get()).toBe(true);

      // Update again and verify change was detected
      conversation$.setGenerating(false);
      expect(onChange).toHaveBeenCalled();

      const updatedConv = store$.conversations.peek().get('test');
      expect(updatedConv?.isGenerating.get()).toBe(false);
    });

    test('addMessage adds observable message', () => {
      // Initialize conversation using the initialization helper
      initConversation('test');

      // Add a message
      const message: Message = {
        role: 'user' as const,
        content: 'test message',
        timestamp: new Date().toISOString(),
      };
      const conversation$ = store$.conversations.get().get('test')!;
      conversation$.addMessage(message);

      // Get the conversation state
      const conv = store$.conversations.peek().get('test');
      expect(conv).toBeDefined();

      // Check the messages
      const messages = conv!.data.log;
      expect(messages).toHaveLength(1);

      // Check the message content
      const firstMsg = messages[0];
      expect(firstMsg).toEqual(
        expect.objectContaining({
          role: 'user',
          content: 'test message',
        })
      );
    });
  });
});
