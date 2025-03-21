import type { FC } from 'react';
import { useRef } from 'react';
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
    isLoading,
    isGenerating$,
    pendingTool$,
    confirmTool,
    interruptGeneration,
  } = useConversation(conversation);

  const showInitialSystem$ = useObservable<boolean>(false);

  const firstNonSystemIndex$ = useObservable(() => {
    return conversationData$.get()?.log.findIndex((msg) => msg.role !== 'system') || 0;
  });
  const hasSystemMessages$ = useObservable(() => {
    return conversationData$.get()?.log.some((msg) => msg.role === 'system') || false;
  });

  // Create a ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Single effect to handle all scrolling
  useObserveEffect(
    () => {
      const scrollToBottom = () => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      };

      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(scrollToBottom);
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

      <div className="relative flex-1 overflow-y-auto" ref={scrollContainerRef}>
        {hasSystemMessages$.get() ? (
          <div className="flex w-full items-center bg-accent/50">
            <div className="mx-auto flex max-w-3xl flex-1 items-center gap-2 p-4">
              <Memo>
                {() => {
                  return (
                    <Checkbox
                      id="showInitialSystem"
                      checked={showInitialSystem$.get()}
                      onCheckedChange={(checked) => {
                        if (!isLoading) {
                          showInitialSystem$.set(checked as boolean);
                        }
                      }}
                      disabled={isLoading}
                    />
                  );
                }}
              </Memo>
              <Label
                htmlFor="showInitialSystem"
                className={`text-sm text-muted-foreground hover:text-foreground ${
                  isLoading ? 'opacity-50' : 'cursor-pointer'
                }`}
              >
                Show initial system messages
              </Label>
            </div>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
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
              const nextMessage$ =
                index < conversationData$.log.length - 1
                  ? conversationData$.log[index + 1]
                  : undefined;

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
        availableModels={AVAILABLE_MODELS}
        defaultModel={AVAILABLE_MODELS[0]}
      />
    </main>
  );
};
