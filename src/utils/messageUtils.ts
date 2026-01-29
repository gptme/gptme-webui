import type { Message } from '@/types/conversation';
import { type Observable } from '@legendapp/state';
import { useObservable } from '@legendapp/state/react';

export const isNonUserMessage = (role?: string) => role === 'assistant' || role === 'system';

// Helper to check if a message should be visible for chain calculations
const isVisibleForChain = (message: Message | undefined): boolean => {
  if (!message) return false;
  if (message.hide) return false;
  return true;
};

// Find the previous visible message in the log
const findPrevVisibleMessage = (log: Message[], currentIndex: number): Message | undefined => {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (isVisibleForChain(log[i])) return log[i];
  }
  return undefined;
};

// Find the next visible message in the log
const findNextVisibleMessage = (log: Message[], currentIndex: number): Message | undefined => {
  for (let i = currentIndex + 1; i < log.length; i++) {
    if (isVisibleForChain(log[i])) return log[i];
  }
  return undefined;
};

export const useMessageChainType = (
  message$: Observable<Message>,
  log$: Observable<Message[]>,
  currentIndex: number
) => {
  const messageChainType$ = useObservable(() => {
    try {
      const message = message$.get();
      if (!message) return 'standalone';

      const log = log$.get() || [];
      const prevVisibleMessage = findPrevVisibleMessage(log, currentIndex);
      const nextVisibleMessage = findNextVisibleMessage(log, currentIndex);

      const isChainStart = !prevVisibleMessage || prevVisibleMessage.role === 'user';
      const isChainEnd = !nextVisibleMessage || nextVisibleMessage.role === 'user';
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
  }, [message$, log$, currentIndex]);
  return messageChainType$;
};
