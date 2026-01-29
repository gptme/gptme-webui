import type { Message } from '@/types/conversation';
import { type Observable } from '@legendapp/state';
import { useObservable } from '@legendapp/state/react';

export const isNonUserMessage = (role?: string) => role === 'assistant' || role === 'system';

// Helper to check if a message should be considered for chain calculations
// Hidden messages are treated as non-existent for chain purposes
const isVisibleForChain = (message: Message | undefined): boolean => {
  if (!message) return false;
  // Messages with hide=true should not affect chain calculations
  if (message.hide) return false;
  return true;
};

export const useMessageChainType = (
  message$: Observable<Message>,
  previousMessage$: Observable<Message | undefined> | undefined,
  nextMessage$: Observable<Message | undefined> | undefined
) => {
  const messageChainType$ = useObservable(() => {
    try {
      const message = message$.get();
      if (!message) return 'standalone';

      const previousMessage = previousMessage$?.get();
      const nextMessage = nextMessage$?.get();

      // Treat hidden messages as non-existent for chain calculations
      const prevVisible = isVisibleForChain(previousMessage);
      const nextVisible = isVisibleForChain(nextMessage);

      const isChainStart = !prevVisible || previousMessage?.role === 'user';
      const isChainEnd = !nextVisible || nextMessage?.role === 'user';
      const isPartOfChain = isNonUserMessage(message.role);

      if (!isPartOfChain) return 'standalone';
      if (isChainStart && isChainEnd) return 'standalone';
      if (isChainStart) return 'start';
      if (isChainEnd) return 'end';
      return 'middle';
    } catch (error) {
      console.warn('Error calculating message chain type:', error);
      return 'standalone';
    }
  }, [message$, previousMessage$, nextMessage$]);
  return messageChainType$;
};
