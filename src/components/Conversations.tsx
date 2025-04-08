import { type FC } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { setDocumentTitle } from '@/utils/title';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { ConversationContent } from '@/components/ConversationContent';
import { useApi } from '@/contexts/ApiContext';
import { demoConversations, type DemoConversation } from '@/democonversations';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { use$, useObserveEffect } from '@legendapp/state/react';
import {
  initializeConversations,
  selectedConversation$,
  conversations$,
} from '@/stores/conversations';

interface Props {
  className?: string;
  route: string;
}

const Conversations: FC<Props> = ({ route }) => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const conversationParam = searchParams.get('conversation');
  const { api, isConnected$, connectionConfig } = useApi();
  const queryClient = useQueryClient();
  const isConnected = use$(isConnected$);
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
      navigate(`${route}?conversation=${id}`);
    },
    [queryClient, navigate, route]
  );

  // Initialize from URL param
  useEffect(() => {
    if (conversationParam) {
      selectedConversation$.set(conversationParam);
    } else {
      selectedConversation$.set(demoConversations[0].name);
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
        const conversations = await api.getConversations(100);
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

  // Initialize store with demo and API conversations
  useEffect(() => {
    // Add demo conversations to store
    demoConversations.forEach((conv: DemoConversation) => {
      conversations$.set(conv.name, {
        data: { log: conv.messages, logfile: conv.name, branches: {} },
        isGenerating: false,
        isConnected: false,
        pendingTool: null,
        showInitialSystem: false,
        readonly: true,
        lastUpdated:
          conv.lastUpdated instanceof Date ? conv.lastUpdated.getTime() : conv.lastUpdated,
      });
    });

    // Add API conversations to store
    if (apiConversations.length) {
      console.log('[Conversations] Initializing API conversations in store:', apiConversations);
      void initializeConversations(
        api,
        apiConversations, // Pass full conversation objects
        10 // Preload limit
      );
    }
  }, [apiConversations, api]);

  // Cancel pending queries when switching conversations
  const prevConversation = useRef(selectedConversation$.get());
  useObserveEffect(selectedConversation$, () => {
    const currentConversation = selectedConversation$.get();
    if (currentConversation && currentConversation !== prevConversation.current) {
      // Cancel queries for previous conversation
      queryClient.cancelQueries({
        queryKey: ['conversation', prevConversation.current],
      });
      prevConversation.current = currentConversation;
    }
  });

  // Update document title when selected conversation changes
  useObserveEffect(selectedConversation$, () => {
    const currentConversation = selectedConversation$.get();
    if (currentConversation) {
      setDocumentTitle(currentConversation);
    } else {
      setDocumentTitle();
    }
    return () => setDocumentTitle(); // Reset title on unmount
  });

  const selectedId = selectedConversation$.get();

  return (
    <div className="flex flex-1 overflow-hidden">
      <LeftSidebar
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onSelectConversation={handleSelectConversation}
        isLoading={isLoading}
        isError={isError}
        error={error as Error}
        onRetry={() => refetch()}
        route={route}
      />
      {selectedId && (
        <ConversationContent
          conversationId={selectedId}
          isReadOnly={!!conversations$.get(selectedId)?.readonly}
        />
      )}
      {/* Right sidebar doesn't need reactivity yet */}
      <RightSidebar
        isOpen={rightSidebarOpen}
        onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
      />
    </div>
  );
};

export default Conversations;
