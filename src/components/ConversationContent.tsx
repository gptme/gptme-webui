import type { FC } from 'react';
import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput, type ChatOptions } from './ChatInput';
import { useConversation } from '@/hooks/useConversation';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ToolConfirmationDialog } from './ToolConfirmationDialog';
import { For, Memo, useObservable, useObserveEffect } from '@legendapp/state/react';
import { getObservableIndex } from '@legendapp/state';
import { useApi } from '@/contexts/ApiContext';

interface Props {
  conversationId: string;
  isReadOnly?: boolean;
}

// This can be replaced with an API call to fetch available models from the server
export const AVAILABLE_MODELS = [
  'anthropic/claude-3-5-sonnet-20240620',
  'anthropic/claude-3-opus-20240229',
  'anthropic/claude-3-sonnet-20240229',
  'anthropic/claude-3-haiku-20240307',
  'openai/gpt-4-turbo',
  'openai/gpt-4',
  'openai/gpt-3.5-turbo',
];

export const ConversationContent: FC<Props> = ({ conversationId, isReadOnly }) => {
  const { conversation$, sendMessage, confirmTool, interruptGeneration } =
    useConversation(conversationId);
  // State to track when to auto-focus the input
  const shouldFocus$ = useObservable(false);
  // Store the previous conversation ID to detect changes
  const prevConversationIdRef = useRef<string | null>(null);

  const { api } = useApi();
  const hasSession$ = useObservable<boolean>(false);

  useObserveEffect(api.sessions$.get(conversationId), () => {
    if (!isReadOnly) {
      hasSession$.set(api.sessions$.get(conversationId).get() !== undefined);
    }
  });

  // Detect when the conversation changes and set focus
  useEffect(() => {
    if (conversationId !== prevConversationIdRef.current) {
      // New conversation detected - set focus flag
      shouldFocus$.set(true);
      // Store the current conversation ID for future comparisons
      prevConversationIdRef.current = conversationId;
    }
  }, [conversationId, shouldFocus$]);

  const firstNonSystemIndex$ = useObservable(() => {
    return conversation$.get()?.data.log.findIndex((msg) => msg.role !== 'system') || 0;
  });

  // Update the firstNonSystemIndex$ when the conversationId changes
  useEffect(() => {
    firstNonSystemIndex$.set(
      conversation$.get()?.data.log.findIndex((msg) => msg.role !== 'system') || 0
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const showInitialSystem$ = useObservable<boolean>(false);

  const hasInitialSystemMessages$ = useObservable(() => {
    return firstNonSystemIndex$.get() > 0;
  });

  // Create a ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Observable for if the conversation is auto-scrolling
  const isAutoScrolling$ = useObservable(false);

  // Observable for if the user scrolled during generation
  const autoScrollAborted$ = useObservable(false);

  // Reset the autoScrollAborted flag when generation is complete or starts again
  useObserveEffect(conversation$?.isGenerating, () => {
    autoScrollAborted$.set(false);
  });

  // Scroll to the bottom when the conversation is updated
  useObserveEffect(conversation$.data.log, () => {
    const scrollToBottom = () => {
      if (scrollContainerRef.current) {
        isAutoScrolling$.set(true);
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        requestAnimationFrame(() => {
          isAutoScrolling$.set(false);
        });
      }
    };

    if (!autoScrollAborted$.get()) {
      requestAnimationFrame(scrollToBottom);
    }
  });

  // Scroll to the bottom when switching conversations
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [conversationId]);

  const handleSendMessage = (message: string, options?: ChatOptions) => {
    sendMessage({ message, options });
  };

  // Handle tool confirmation
  const handleConfirmTool = async () => {
    await confirmTool('confirm');
  };

  const handleEditTool = async (content: string) => {
    await confirmTool('edit', { content });
  };

  const handleSkipTool = async () => {
    await confirmTool('skip');
  };

  const handleAutoConfirmTool = async (count: number) => {
    await confirmTool('auto', { count });
  };

  if (!conversation$) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Tool Confirmation Dialog */}
      <ToolConfirmationDialog
        pendingTool$={conversation$?.pendingTool}
        onConfirm={handleConfirmTool}
        onEdit={handleEditTool}
        onSkip={handleSkipTool}
        onAuto={handleAutoConfirmTool}
      />

      <div
        className="relative flex-1 overflow-y-auto"
        ref={scrollContainerRef}
        onScroll={() => {
          if (!scrollContainerRef.current || isAutoScrolling$.get()) return;
          const isBottom =
            Math.abs(
              scrollContainerRef.current.scrollHeight -
                (scrollContainerRef.current.scrollTop + scrollContainerRef.current.clientHeight)
            ) <= 1;
          if (isBottom) {
            autoScrollAborted$.set(false);
          } else {
            autoScrollAborted$.set(true);
          }
        }}
      >
        <Memo>
          {() =>
            hasInitialSystemMessages$.get() && (
              <div className="flex w-full items-center bg-accent/50">
                <div className="mx-auto flex max-w-3xl flex-1 items-center gap-2 p-4">
                  <Checkbox
                    id="showInitialSystem"
                    checked={showInitialSystem$.get()}
                    onCheckedChange={(checked) => {
                      showInitialSystem$.set(checked === true);
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
            )
          }
        </Memo>
        <For each={conversation$.data.log}>
          {(msg$) => {
            const index = getObservableIndex(msg$);
            // Hide all system messages before the first non-system message by default
            const firstNonSystemIndex = firstNonSystemIndex$.get();
            const isInitialSystem =
              msg$.role.get() === 'system' &&
              (firstNonSystemIndex === -1 || index < firstNonSystemIndex);
            if (isInitialSystem && !showInitialSystem$.get()) {
              return <div key={`${index}-${msg$.timestamp.get()}`} />;
            }

            // Get the previous and next messages for spacing context
            const previousMessage$ = index > 0 ? conversation$.data.log[index - 1] : undefined;
            const nextMessage$ = conversation$.data.log[index + 1];

            return (
              <ChatMessage
                key={`${index}-${msg$.timestamp.get()}`}
                message$={msg$}
                previousMessage$={previousMessage$}
                nextMessage$={nextMessage$}
                conversationId={conversationId}
              />
            );
          }}
        </For>

        {/* Add a margin at the bottom */}
        <div className="mb-[10vh]" />
      </div>

      <ChatInput
        conversationId={conversationId}
        onSend={handleSendMessage}
        onInterrupt={interruptGeneration}
        isReadOnly={isReadOnly}
        hasSession$={hasSession$}
        defaultModel={AVAILABLE_MODELS[0]}
        availableModels={AVAILABLE_MODELS}
        autoFocus$={shouldFocus$}
      />
    </main>
  );
};
