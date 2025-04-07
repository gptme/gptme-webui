import type { FC } from 'react';
import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput, type ChatOptions } from './ChatInput';
import { useConversation } from '@/hooks/useConversation';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';
import type { ConversationItem } from './ConversationList';
import { ToolConfirmationDialog } from './ToolConfirmationDialog';
import { For, Memo, useObservable, useObserveEffect } from '@legendapp/state/react';
import { getObservableIndex, type Observable } from '@legendapp/state';
import { type Message } from '@/types/conversation';

interface Props {
  conversation: ConversationItem;
}

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

export const ConversationContent: FC<Props> = ({ conversation }) => {
  const {
    conversationData$,
    sendMessage,
    isLoading$,
    isGenerating$,
    pendingTool$,
    confirmTool,
    interruptGeneration,
    hasSession$,
  } = useConversation(conversation);

  // State to track when to auto-focus the input
  const shouldFocus$ = useObservable(false);
  // Store the previous conversation name to detect changes
  const prevConversationNameRef = useRef<string | null>(null);

  // Detect when the conversation changes and set focus
  useEffect(() => {
    if (conversation.name !== prevConversationNameRef.current) {
      // New conversation detected - set focus flag
      shouldFocus$.set(true);

      // Store the current conversation name for future comparisons
      prevConversationNameRef.current = conversation.name;
    }
  }, [conversation.name, shouldFocus$]);

  const showInitialSystem$ = useObservable<boolean>(false);

  const firstNonSystemIndex$ = useObservable(() => {
    return conversationData$.get()?.log.findIndex((msg) => msg.role !== 'system') || 0;
  });
  const hasSystemMessages$ = useObservable(() => {
    return conversationData$.get()?.log.some((msg) => msg.role === 'system') || false;
  });

  // Create a ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Observable for if the conversation is auto-scrolling. Needed to separate the user's scroll event from the auto-scrolling event
  const isAutoScrolling$ = useObservable(false);

  // Observable for if the user scrolled during generation
  const autoScrollAborted$ = useObservable(false);

  // Reset the autoScrollAborted flag when generation is complete or starts again
  useObserveEffect(isGenerating$, () => {
    autoScrollAborted$.set(false);
  });

  // Scroll to the bottom when the conversation is updated, unless the user aborted the auto-scrolling by scrolling up
  useObserveEffect(
    () => {
      const scrollToBottom = () => {
        if (scrollContainerRef.current) {
          isAutoScrolling$.set(true);
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          // Reset the flag after the browser has processed the scroll
          requestAnimationFrame(() => {
            isAutoScrolling$.set(false);
          });
        }
      };

      if (!autoScrollAborted$.get()) {
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(scrollToBottom);
      }
    },
    { deps: [conversationData$.log] }
  );

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

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Tool Confirmation Dialog */}
      <ToolConfirmationDialog
        pendingTool$={pendingTool$}
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
            // If the user scrolled to the bottom, re-enable auto-scrolling
            autoScrollAborted$.set(false);
          } else {
            // If the user scrolled up, abort the auto-scrolling
            autoScrollAborted$.set(true);
          }
        }}
      >
        {hasSystemMessages$.get() ? (
          <Memo>
            {() => {
              return (
                <div className="flex w-full items-center bg-accent/50">
                  <div className="mx-auto flex max-w-3xl flex-1 items-center gap-2 p-4">
                    <Checkbox
                      id="showInitialSystem"
                      checked={showInitialSystem$.get()}
                      onCheckedChange={(checked) => {
                        if (!isLoading$.get()) {
                          showInitialSystem$.set(checked as boolean);
                        }
                      }}
                      disabled={isLoading$.get()}
                    />
                    <Label
                      htmlFor="showInitialSystem"
                      className={`text-sm text-muted-foreground hover:text-foreground ${
                        isLoading$.get() ? 'opacity-50' : 'cursor-pointer'
                      }`}
                    >
                      Show initial system messages
                    </Label>
                  </div>
                  {isLoading$.get() && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              );
            }}
          </Memo>
        ) : null}
        {conversationData$.log.get() !== undefined && (
          <For each={conversationData$.log as Observable<Message[]>} optimized>
            {(msg$) => {
              const index = getObservableIndex(msg$);
              // Hide all system messages before the first non-system message by default
              const firstNonSystemIndex = firstNonSystemIndex$.get();
              const isInitialSystem =
                msg$.role.get() === 'system' &&
                (firstNonSystemIndex === -1 || index < firstNonSystemIndex);
              if (isInitialSystem && !showInitialSystem$.get()) {
                return <></>;
              }

              // Get the previous and next messages for spacing context
              const previousMessage$ = index > 0 ? conversationData$.log[index - 1] : undefined;
              const nextMessage$ = conversationData$.log[index + 1];

              return (
                <ChatMessage
                  key={`${index}-${msg$.timestamp.get()}`}
                  message$={msg$}
                  previousMessage$={previousMessage$}
                  nextMessage$={nextMessage$}
                  conversationId={conversation.name}
                />
              );
            }}
          </For>
        )}
        {/* Add a margin at the bottom to give the last message some space and signify end of conversation */}
        <div className="mb-[10vh]"></div>
      </div>
      <ChatInput
        onSend={handleSendMessage}
        onInterrupt={async () => {
          console.log('Interrupting from ConversationContent...');
          // Use the API's interrupt method
          await interruptGeneration();
        }}
        isReadOnly={conversation.readonly}
        isGenerating$={isGenerating$}
        hasSession$={hasSession$}
        availableModels={AVAILABLE_MODELS}
        defaultModel={AVAILABLE_MODELS[0]}
        autoFocus$={shouldFocus$}
      />
    </main>
  );
};
