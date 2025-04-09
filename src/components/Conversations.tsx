import { type FC } from 'react';
import { useEffect } from 'react';
import { setDocumentTitle } from '@/utils/title';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { ConversationContent } from '@/components/ConversationContent';
import { useApi } from '@/contexts/ApiContext';
import { demoConversations } from '@/democonversations';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Memo, observer, use$, useObserveEffect } from '@legendapp/state/react';
import { store$, initConversation } from '@/stores/conversations';

interface Props {
  className?: string;
  route: string;
}

const Conversations: FC<Props> = observer(({ route }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { api, isConnected$, connectionConfig } = useApi();
  const queryClient = useQueryClient();
  const isConnected = use$(isConnected$);

  // Fetch conversations from API
  const {
    data: apiConversations = [],
    isError,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['conversations', connectionConfig.baseUrl, isConnected],
    queryFn: async () => {
      if (!isConnected) {
        console.warn('Attempting to fetch conversations while disconnected');
        return [];
      }
      return api.getConversations(100);
    },
    enabled: isConnected,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isError) {
    console.error('Error fetching conversations:', error);
  }

  // Initialize store with demo conversations
  useEffect(() => {
    demoConversations.forEach((conv) => {
      initConversation(
        conv.name,
        {
          log: conv.messages,
          logfile: conv.name,
          branches: {},
        },
        true
      );
    });
  }, []);

  // Initialize API conversations when loaded
  useEffect(() => {
    if (apiConversations.length) {
      void store$.initializeConversations(api, apiConversations, 10);
    }
  }, [apiConversations, api]);

  // URL sync
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      store$.selectConversation(conversationId);
    } else {
      store$.selectConversation(demoConversations[0].name);
    }
  }, [searchParams]);

  // Update URL when selection changes
  useObserveEffect(
    () => {
      const currentId = store$.selectedId.get();
      if (currentId) {
        navigate(`${route}?conversation=${currentId}`, { replace: true });
      }
    },
    { deps: [store$.selectedId] }
  );

  // Update document title
  useObserveEffect(
    () => {
      const currentId = store$.selectedId.get();
      setDocumentTitle(currentId || undefined);
      return () => setDocumentTitle();
    },
    { deps: [store$.selectedId] }
  );

  // Cancel pending queries when switching conversations
  useObserveEffect(
    () => {
      const currentId = store$.selectedId.get();
      const prevId = store$.selectedId.get();
      if (currentId && prevId && currentId !== prevId) {
        queryClient.cancelQueries({
          queryKey: ['conversation', prevId],
        });
      }
    },
    { deps: [store$.selectedId] }
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <Memo>
        {() => (
          <LeftSidebar
            isOpen={store$.ui.leftSidebarOpen.get()}
            onToggle={() => store$.toggleSidebar('left')}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
          />
        )}
      </Memo>

      <ConversationContent />

      <Memo>
        {() => (
          <RightSidebar
            isOpen={store$.ui.rightSidebarOpen.get()}
            onToggle={() => store$.toggleSidebar('right')}
          />
        )}
      </Memo>
    </div>
  );
});

export default Conversations;
