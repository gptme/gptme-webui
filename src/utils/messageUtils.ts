import type { Message } from '@/types/conversation';
import { type Observable } from '@legendapp/state';
import { useObservable } from '@legendapp/state/react';

export const isNonUserMessage = (role?: string) => role === 'assistant' || role === 'system';

export const useMessageChainType = (
  message$: Observable<Message>,
  previousMessage$: Observable<Message | undefined> | undefined,
  nextMessage$: Observable<Message | undefined> | undefined
) => {
  const messageChainType$ = useObservable(() => {
    const isChainStart = !previousMessage$ || previousMessage$.role.get() === 'user';
    const isChainEnd = !nextMessage$ || nextMessage$.role.get() === 'user';
    const isPartOfChain = isNonUserMessage(message$.role.get());

    if (!isPartOfChain) return 'standalone';
    if (isChainStart && isChainEnd) return 'standalone';
    if (isChainStart) return 'start';
    if (isChainEnd) return 'end';
    return 'middle';
  });
  return messageChainType$;
};
