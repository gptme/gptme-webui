import { useMemo, type FC } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { setDocumentTitle } from '@/utils/title';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { ConversationContent } from '@/components/ConversationContent';
import { useApi } from '@/contexts/ApiContext';
import type { ConversationItem } from '@/components/ConversationList';
import { toConversationItems } from '@/utils/conversation';
import { demoConversations, type DemoConversation } from '@/democonversations';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Memo, use$, useObservable, useObserveEffect } from '@legendapp/state/react';
import { initializeConversations, selectedConversation$ } from '@/stores/conversations';

interface Props {
  className?: string;
  route: string;
}

const Conversations: FC<Props> = ({ route }) => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const rightSidebarOpen$ = useObservable(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const conversationParam = searchParams.get('conversation');
  const { api, isConnected$, connectionConfig } = useApi();
  const queryClient = useQueryClient();
  const isConnected = use$(isConnected$);

  // Update selected conversation when URL param changes
  useEffect(() => {
    if (conversationParam) {
      selectedConversation$.set(conversationParam);
    }
  }, [conversationParam]);

  // Fetch conversations from API with proper caching
  const {
    data: apiConversations = [],
    isError,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['conversations', connectionConfig.baseUrl, isConnected],
    queryFn: async () => {
      console.log('Fetching conversations, connection state:', isConnected);
      if (!isConnected) {
        console.warn('Attempting to fetch conversations while disconnected');
        return [];
      }
      try {
        const conversations = await api.getConversations();
        console.log('Fetched conversations:', conversations);
        return conversations;
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
        throw err;
      }
    },
    enabled: isConnected,
    staleTime: 0, // Always refetch when query is invalidated
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Log any query errors
  if (isError) {
    console.error('Conversation query error:', error);
  }

  // Combine demo and API conversations and initialize store
  const allConversations: ConversationItem[] = useMemo(() => {
    // Initialize API conversations in store
    if (apiConversations.length) {
      console.log('[Conversations] Initializing conversations in store');
      void initializeConversations(
        api,
        apiConversations.map((c) => c.name),
        10
      );
    }

    return [
      // Convert demo conversations to ConversationItems
      ...demoConversations.map((conv: DemoConversation) => ({
        name: conv.name,
        lastUpdated: conv.lastUpdated,
        messageCount: conv.messages.length,
        readonly: true,
      })),
      // Convert API conversations to ConversationItems
      ...toConversationItems(apiConversations),
    ];
  }, [apiConversations, api]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === selectedConversation$.get()) {
        return;
      }
      // Cancel any pending queries for the previous conversation
      queryClient.cancelQueries({
        queryKey: ['conversation', selectedConversation$.get()],
      });
      selectedConversation$.set(id);
      // Update URL with the new conversation ID
      console.log(`[Conversations] [handleSelectConversation] id: ${id}`);
      navigate(`${route}?conversation=${id}`);
    },
    [queryClient, navigate, route]
  );

  const conversation$ = useObservable<ConversationItem | undefined>(undefined);

  // Update conversation$ when selectedConversation$ changes
  useObserveEffect(selectedConversation$, ({ value: selectedConversation }) => {
    conversation$.set(allConversations.find((conv) => conv.name === selectedConversation));
  });

  // Update conversation$ when allConversations changes
  useEffect(() => {
    conversation$.set(allConversations.find((conv) => conv.name === selectedConversation$.get()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allConversations]);

  // Update document title when selected conversation changes
  useObserveEffect(conversation$, ({ value: conversation }) => {
    if (conversation) {
      setDocumentTitle(conversation.name);
    } else {
      setDocumentTitle();
    }
    return () => setDocumentTitle(); // Reset title on unmount
  });

  return (
    <div className="flex flex-1 overflow-hidden">
      <LeftSidebar
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        conversations={allConversations}
        selectedConversationId$={selectedConversation$}
        onSelectConversation={handleSelectConversation}
        isLoading={isLoading}
        isError={isError}
        error={error as Error}
        onRetry={() => refetch()}
        route={route}
      />
      <Memo>
        {() => {
          const conversation = conversation$.get();
          return conversation ? (
            <>
              <ConversationContent
                conversationId={conversation.name}
                isReadOnly={conversation.readonly}
              />
              <RightSidebar
                isOpen$={rightSidebarOpen$}
                onToggle={() => {
                  rightSidebarOpen$.set(!rightSidebarOpen$.get());
                }}
                conversationId={conversation.name}
              />
            </>
          ) : null;
        }}
      </Memo>
    </div>
  );
};

export default Conversations;
