import type { FC } from 'react';
import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput, type ChatOptions } from './ChatInput';
import { useConversation } from '@/hooks/useConversation';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ToolConfirmationDialog } from './ToolConfirmationDialog';
import { For, Memo, observer, use$, useObservable, useObserveEffect } from '@legendapp/state/react';
import { store$ } from '@/stores/conversations';

// This can be replaced with an API call to fetch available models from the server
const AVAILABLE_MODELS = [
  'anthropic/claude-3-5-sonnet-20240620',
  'anthropic/claude-3-opus-20240229',
  'anthropic/claude-3-sonnet-20240229',
  'anthropic/claude-3-haiku-20240307',
  'openai/gpt-4-turbo',
  'openai/gpt-4',
  'openai/gpt-3.5-turbo',
];

export const ConversationContent: FC = observer(() => {
  const selectedId = use$(store$.selectedId);
  // Get the conversation from the store and ensure we get its value
  const selectedConv = use$(() => {
    if (!selectedId) return null;
    const conv = store$.conversations.get(selectedId);
    return conv ? conv.peek() : null;
  });

  if (!selectedId || !selectedConv) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">No conversation selected</div>
      </div>
    );
  }

  return <ConversationChat />;
});

export const ConversationChat: FC = observer(() => {
  const selectedId = use$(store$.selectedId);
  const { sendMessage, confirmTool, interruptGeneration } = useConversation(selectedId!);

  // Local UI state
  const local$ = useObservable({
    shouldFocus: false,
    firstNonSystemIndex: 0,
  });

  // Get selected conversation
  const selectedConv = selectedId ? store$.conversations.get(selectedId) : null;
  if (!selectedConv) return null;

  // Update focus when conversation changes
  useEffect(() => {
    local$.shouldFocus.set(true);
  }, [selectedId, local$.shouldFocus]); // Add missing dependency

  // Compute first non-system message index
  useObserveEffect(
    () => {
      if (!selectedConv) return;
      const index = selectedConv.data.log.findIndex((msg$) => msg$.role.get() === 'system');
      local$.firstNonSystemIndex.set(index === -1 ? 0 : index);
    },
    { deps: [selectedConv?.data.log] }
  );

  // Compute if conversation has system messages
  const hasSystemMessages = use$(
    () => selectedConv?.data.log.some((msg$) => msg$.role.get() === 'system') ?? false
  );

  // Scroll handling
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset auto-scroll when generation starts/stops
  useObserveEffect(
    () => {
      if (!selectedConv) return;
      if (selectedConv.isGenerating.get()) {
        store$.ui.autoScrollAborted.set(false);
      }
    },
    { deps: [selectedConv?.isGenerating] }
  );

  // Auto-scroll when messages change
  useObserveEffect(
    () => {
      if (!selectedConv) return;

      const scrollToBottom = () => {
        if (scrollRef.current && !store$.ui.autoScrollAborted.get()) {
          store$.ui.isAutoScrolling.set(true);
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          requestAnimationFrame(() => {
            store$.ui.isAutoScrolling.set(false);
          });
        }
      };
      requestAnimationFrame(scrollToBottom);
    },
    { deps: [selectedConv?.data.log] }
  );

  // Message handlers
  const messageHandlers = {
    handleSendMessage: (message: string, options?: ChatOptions) => {
      sendMessage({ message, options });
    },
    handleConfirmTool: async () => {
      await confirmTool('confirm');
    },
    handleEditTool: async (content: string) => {
      await confirmTool('edit', { content });
    },
    handleSkipTool: async () => {
      await confirmTool('skip');
    },
    handleAutoConfirmTool: async (count: number) => {
      await confirmTool('auto', { count });
    },
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Tool Confirmation Dialog */}
      <ToolConfirmationDialog
        pendingTool$={selectedConv.pendingTool}
        onConfirm={messageHandlers.handleConfirmTool}
        onEdit={messageHandlers.handleEditTool}
        onSkip={messageHandlers.handleSkipTool}
        onAuto={messageHandlers.handleAutoConfirmTool}
      />

      {/* Messages Container */}
      <div
        className="relative flex-1 overflow-y-auto"
        ref={scrollRef}
        onScroll={() => {
          if (!scrollRef.current || store$.ui.isAutoScrolling.get()) return;
          const isBottom =
            Math.abs(
              scrollRef.current.scrollHeight -
                (scrollRef.current.scrollTop + scrollRef.current.clientHeight)
            ) <= 1;
          store$.ui.autoScrollAborted.set(!isBottom);
        }}
      >
        {/* System Messages Toggle */}
        {hasSystemMessages && (
          <Memo>
            {() => (
              <div className="flex w-full items-center bg-accent/50">
                <div className="mx-auto flex max-w-3xl flex-1 items-center gap-2 p-4">
                  <Checkbox
                    id="showInitialSystem"
                    checked={store$.ui.showInitialSystem.get()}
                    onCheckedChange={(checked) => {
                      store$.ui.showInitialSystem.set(checked as boolean);
                    }}
                  />
                  <Label
                    htmlFor="showInitialSystem"
                    className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                  >
                    Show initial system messages
                  </Label>
                </div>
              </div>
            )}
          </Memo>
        )}

        {/* Messages */}
        {selectedConv && (
          <For each={selectedConv.data.log} optimized>
            {(msg$, i) => (
              <Memo>
                {() => {
                  const index = Number(i);
                  const isInitialSystem =
                    msg$.role.get() === 'system' && index < local$.firstNonSystemIndex.get();

                  if (isInitialSystem && !store$.ui.showInitialSystem.get()) {
                    return null;
                  }

                  return (
                    <ChatMessage
                      message$={msg$}
                      previousMessage$={index > 0 ? selectedConv.data.log[index - 1] : undefined}
                      nextMessage$={
                        index < selectedConv.data.log.length - 1
                          ? selectedConv.data.log[index + 1]
                          : undefined
                      }
                      conversationId={selectedId!}
                    />
                  );
                }}
              </Memo>
            )}
          </For>
        )}

        {/* Bottom margin */}
        <div className="mb-[10vh]" />
      </div>

      {/* Chat Input */}
      <ChatInput
        conversationId={selectedId!}
        onSend={messageHandlers.handleSendMessage}
        onInterrupt={interruptGeneration}
        defaultModel={AVAILABLE_MODELS[0]}
        availableModels={AVAILABLE_MODELS}
        autoFocus$={local$.shouldFocus}
      />
    </main>
  );
});
