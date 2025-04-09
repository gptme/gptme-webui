import { observable } from '@legendapp/state';
import { store$, actions, initialization } from '../conversations';
import type { ConversationStateData } from '../conversations';
import type { Message } from '@/types/conversation';
import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('conversations store', () => {
  beforeEach(() => {
    // Clear the store before each test
    store$.conversations.set(new Map());
  });

  describe('basic operations', () => {
    test('can add a conversation', () => {
      const initialConv = observable<ConversationStateData>({
        data: {
          log: [],
          logfile: 'test',
          branches: {},
        },
        isGenerating: false,
        isConnected: false,
        pendingTool: null,
        showInitialSystem: false,
        readonly: false,
        lastUpdated: Date.now(),
      });

      store$.conversations.set('test', initialConv);

      const stored = store$.conversations.peek().get('test');
      // Compare the raw values
      expect(stored?.data.log).toEqual([]);
      expect(stored?.isGenerating).toBe(false);
      expect(stored?.readonly).toBe(false);
    });

    test('can update conversation fields', () => {
      // Add initial conversation
      const conv = observable<ConversationStateData>({
        data: {
          log: [],
          logfile: 'test',
          branches: {},
        },
        isGenerating: false,
        isConnected: false,
        pendingTool: null,
        showInitialSystem: false,
        readonly: false,
        lastUpdated: Date.now(),
      });
      store$.conversations.set('test', conv);

      // Update a field
      actions.updateConversation('test', { isGenerating: true });

      // Check the update
      expect(store$.conversations.peek().get('test')?.isGenerating).toBe(true);
    });

    test('store is reactive to Map changes', () => {
      const onChange = vi.fn();
      store$.conversations.onChange(onChange);

      const conv = observable<ConversationStateData>({
        data: {
          log: [],
          logfile: 'test',
          branches: {},
        },
        isGenerating: false,
        isConnected: false,
        pendingTool: null,
        showInitialSystem: false,
        readonly: false,
        lastUpdated: Date.now(),
      });

      store$.conversations.set('test', conv);
      expect(onChange).toHaveBeenCalled();

      // Should also be reactive to field changes
      const fieldChange = vi.fn();
      conv.isGenerating.onChange(fieldChange);
      conv.isGenerating.set(true);
      expect(fieldChange).toHaveBeenCalled();
    });
  });

  describe('conversation values', () => {
    test('readonly is observable', () => {
      const conv = observable<ConversationStateData>({
        data: {
          log: [],
          logfile: 'test',
          branches: {},
        },
        isGenerating: false,
        isConnected: false,
        pendingTool: null,
        showInitialSystem: false,
        readonly: false,
        lastUpdated: Date.now(),
      });
      store$.conversations.set('test', conv);

      const onChange = vi.fn();
      store$.conversations.onChange(onChange);

      // Should be able to get/set via observable methods
      expect(store$.conversations.peek().get('test')?.readonly).toBe(false);

      actions.updateConversation('test', { readonly: true });

      expect(onChange).toHaveBeenCalled();
      expect(store$.conversations.peek().get('test')?.readonly).toBe(true);
    });

    test('lastUpdated is observable', () => {
      const now = Date.now();
      const conv = observable<ConversationStateData>({
        data: {
          log: [],
          logfile: 'test',
          branches: {},
        },
        isGenerating: false,
        isConnected: false,
        pendingTool: null,
        showInitialSystem: false,
        readonly: false,
        lastUpdated: now,
      });
      store$.conversations.set('test', conv);

      const onChange = vi.fn();
      store$.conversations.onChange(onChange);

      // Should be able to get/set via observable methods
      expect(store$.conversations.peek().get('test')?.lastUpdated).toBe(now);

      const newTime = now + 1000;
      actions.updateConversation('test', { lastUpdated: newTime });

      expect(onChange).toHaveBeenCalled();
      expect(store$.conversations.peek().get('test')?.lastUpdated).toBe(newTime);
    });
  });

  describe('actions', () => {
    test('updateConversation updates fields correctly', () => {
      // Initialize conversation
      initialization.initConversation('test');

      // Setup change detection
      const onChange = vi.fn();
      store$.conversations.onChange(onChange);

      // Update fields
      actions.updateConversation('test', {
        isGenerating: true,
        readonly: true,
      });

      // Get the updated state
      const conv = store$.conversations.peek().get('test');
      expect(conv).toBeDefined();
      expect(conv?.isGenerating).toBe(true);
      expect(conv?.readonly).toBe(true);

      // Update again and verify change was detected
      actions.updateConversation('test', { isGenerating: false });
      expect(onChange).toHaveBeenCalled();

      const updatedConv = store$.conversations.peek().get('test');
      expect(updatedConv?.isGenerating).toBe(false);
    });

    test('addMessage adds observable message', () => {
      // Initialize conversation using the initialization helper
      initialization.initConversation('test');

      // Add a message
      const message: Message = {
        role: 'user' as const,
        content: 'test message',
        timestamp: new Date().toISOString(),
      };
      actions.addMessage('test', message);

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
