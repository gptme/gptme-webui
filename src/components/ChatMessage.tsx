import type { FC } from 'react';
import type { Message } from '@/types/conversation';
import { MessageAvatar } from './MessageAvatar';
import { parseMarkdownContent } from '@/utils/markdownUtils';
import { useMessageChainType } from '@/utils/messageUtils';
import { useApi } from '@/contexts/ApiContext';
import { type Observable } from '@legendapp/state';
import { Memo, useObservable } from '@legendapp/state/react';

interface Props {
  message$: Observable<Message>;
  previousMessage$?: Observable<Message | undefined>;
  nextMessage$?: Observable<Message | undefined>;
  conversationId: string;
}

export const ChatMessage: FC<Props> = ({
  message$,
  previousMessage$,
  nextMessage$,
  conversationId,
}) => {
  const { baseUrl } = useApi();

  const processedContent$ = useObservable(() => {
    const content =
      message$.content.get() || (message$.role.get() === 'assistant' ? 'Thinking...' : '');
    try {
      const result = parseMarkdownContent(content);
      return result;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return content;
    }
  });

  const renderFiles = () => {
    if (!message$.files.get()?.length) return null;

    return (
      <div className="mt-2 space-y-2">
        <Memo>
          {() => {
            return message$.files.map((filename$) => {
              // Remove any parent directory references and normalize path
              const filename = filename$.get();
              const sanitizedPath = filename
                .split('/')
                .filter((part) => part !== '..')
                .join('/');
              const fileUrl = `${baseUrl}/api/conversations/${conversationId}/files/${sanitizedPath}`;
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

              // Get just the filename without path for display
              const displayName = sanitizedPath.split('/').pop() || sanitizedPath;

              if (isImage) {
                return (
                  <div key={filename} className="max-w-md">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block cursor-zoom-in"
                      title="Click to view full size"
                    >
                      <div className="relative">
                        <img
                          src={fileUrl}
                          alt={displayName}
                          className="rounded-md border border-border transition-opacity hover:opacity-90"
                          onError={(e) => {
                            const img = e.currentTarget;
                            const errorDiv = img.parentElement?.querySelector('.error-message');
                            if (errorDiv) {
                              if (img.src.includes('..')) {
                                errorDiv.textContent =
                                  '⚠️ Cannot access files outside the workspace';
                              } else {
                                errorDiv.textContent = '⚠️ Failed to load image';
                              }
                              errorDiv.classList.remove('hidden');
                            }
                            img.classList.add('hidden');
                          }}
                        />
                        <div className="error-message hidden rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"></div>
                      </div>
                    </a>
                    <div className="mt-1 text-xs text-muted-foreground">{displayName}</div>
                  </div>
                );
              }

              return (
                <div key={filename} className="text-sm">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    📎 {displayName}
                  </a>
                </div>
              );
            });
          }}
        </Memo>
      </div>
    );
  };

  const isUser$ = useObservable(() => message$.role.get() === 'user');
  const isAssistant$ = useObservable(() => message$.role.get() === 'assistant');
  const isSystem$ = useObservable(() => message$.role.get() === 'system');
  const isError$ = useObservable(() => processedContent$.get().startsWith('Error'));
  const isSuccess$ = useObservable(
    () =>
      processedContent$.get().startsWith('Patch successfully') ||
      processedContent$.get().startsWith('Saved')
  );

  const chainType$ = useMessageChainType(message$, previousMessage$, nextMessage$);

  const messageClasses = useObservable(
    () => `
        ${
          isUser$.get()
            ? 'bg-[#EAF4FF] text-black dark:bg-[#2A3441] dark:text-white'
            : isAssistant$.get()
              ? 'bg-[#F8F9FA] dark:bg-card text-foreground'
              : isSystem$.get()
                ? 'font-mono border ' +
                  (isError$.get()
                    ? 'bg-[#FFF2F2] text-red-600 dark:bg-[#440000] dark:text-red-300 border-red-400 dark:border-red-800'
                    : isSuccess$.get()
                      ? 'bg-[#F0FDF4] text-green-700 dark:bg-[#003300] dark:text-green-200 border-green-400 dark:border-green-800'
                      : 'bg-[#DDD] text-[#111] dark:bg-[#111] dark:text-gray-100 border-gray-200 dark:border-gray-800')
                : 'bg-card'
        }
        ${(chainType$.get() === 'standalone' && 'rounded-lg') || ''}
        ${(chainType$.get() === 'start' && 'rounded-t-lg') || ''}
        ${(chainType$.get() === 'end' && 'rounded-b-lg') || ''}
        ${chainType$.get() === 'middle' && ''}
        ${(chainType$.get() !== 'start' && chainType$.get() !== 'standalone' && 'border-t-0') || ''}
        border
    `
  );

  const wrapperClasses = useObservable(
    () => `
        ${chainType$.get() !== 'start' && chainType$.get() !== 'standalone' ? '-mt-[2px]' : 'mt-4'}
        ${chainType$.get() === 'standalone' ? 'mb-4' : 'mb-0'}
    `
  );

  return (
    <div className={`role-${message$.role.get()} ${wrapperClasses.get()}`}>
      <div className="mx-auto max-w-3xl px-4">
        <div className="relative">
          <MessageAvatar
            role$={message$.role}
            isError$={isError$}
            isSuccess$={isSuccess$}
            chainType$={chainType$}
          />
          <div className="md:px-12">
            <div className={messageClasses.get()}>
              <div className="px-3 py-1.5">
                <Memo>
                  {() => (
                    <div
                      className="chat-message prose prose-sm dark:prose-invert prose-pre:overflow-x-auto prose-pre:max-w-[calc(100vw-16rem)]"
                      dangerouslySetInnerHTML={{ __html: processedContent$.get() }}
                    />
                  )}
                </Memo>
                {renderFiles()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
