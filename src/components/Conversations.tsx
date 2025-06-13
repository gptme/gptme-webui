import { useMemo, useRef, type FC } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useCallback, useEffect } from 'react';
import { WelcomeView } from '@/components/WelcomeView';
import { setDocumentTitle } from '@/utils/title';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { ConversationContent } from '@/components/ConversationContent';
import { useApi } from '@/contexts/ApiContext';
import type { ConversationSummary } from '@/types/conversation';
import { demoConversations, getDemoMessages } from '@/democonversations';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Memo, use$, useObservable, useObserveEffect } from '@legendapp/state/react';
import {
  initializeConversations,
  selectedConversation$,
  initConversation,
  conversations$,
} from '@/stores/conversations';
import {
  leftSidebarVisible$,
  rightSidebarVisible$,
  setLeftPanelRef,
  setRightPanelRef,
} from '@/stores/sidebar';

interface Props {
  className?: string;
  route: string;
}

const Conversations: FC<Props> = ({ route }) => {
  // No need for sidebar state management as it's handled by ResizablePanel
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const conversationParam = searchParams.get('conversation');
  const stepParam = searchParams.get('step');
  const { api, isConnected$, connectionConfig } = useApi();
  const queryClient = useQueryClient();
  const isConnected = use$(isConnected$);
  const conversation$ = useObservable<ConversationSummary | undefined>(undefined);
  // Track demo initialization
  // Initialize demo conversations and handle selection on mount
  useEffect(() => {
    // Initialize demos in store
    demoConversations.forEach((conv) => {
      const messages = getDemoMessages(conv.id);
      initConversation(conv.id, {
        id: conv.id,
        name: conv.name,
        log: messages,
        logfile: conv.name,
        branches: {},
        workspace: conv.workspace || '/demo/workspace',
      });
    });

    // Handle initial conversation selection
    if (conversationParam) {
      selectedConversation$.set(conversationParam);
    } else {
      // Need to use empty string instead of null due to type constraints
      selectedConversation$.set('');
    }
  }, [conversationParam]);

  // Handle step parameter for auto-generation
  useEffect(() => {
    if (stepParam === 'true' && conversationParam && isConnected) {
      console.log(`[Conversations] Step parameter detected for ${conversationParam}`);

      // Watch for conversation to be connected
      const checkAndStart = () => {
        const conversation = conversations$.get(conversationParam);
        if (conversation?.isConnected.get()) {
          console.log(
            `[Conversations] Conversation ${conversationParam} is connected, starting generation`
          );

          // Start generation
          api.step(conversationParam).catch((error) => {
            console.error('[Conversations] Failed to start generation:', error);
          });

          // Remove step parameter from URL
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('step');
          navigate(`${route}?${newSearchParams.toString()}`, { replace: true });
        } else {
          // Check again in 100ms
          setTimeout(checkAndStart, 100);
        }
      };

      checkAndStart();
    }
  }, [stepParam, conversationParam, isConnected, api, navigate, route, searchParams]);

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
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Log any query errors
  if (isError) {
    console.error('Conversation query error:', error);
  }

  // Prepare demo conversation items
  const demoItems: ConversationSummary[] = useMemo(() => demoConversations, []);

  // Handle API conversations separately
  const apiItems: ConversationSummary[] = useMemo(() => {
    if (!isConnected) return [];
    return apiConversations;
  }, [isConnected, apiConversations]);

  // Initialize API conversations in store when available
  useEffect(() => {
    if (isConnected && apiConversations.length) {
      console.log('[Conversations] Initializing API conversations');
      void initializeConversations(
        api,
        apiConversations.map((c) => c.id),
        10
      );
    }
  }, [isConnected, apiConversations, api]);

  // Combine demo and API conversations
  const allConversations: ConversationSummary[] = useMemo(() => {
    console.log('[Conversations] Combining conversations', {
      demoCount: demoItems.length,
      apiCount: apiItems.length,
    });
    return [...demoItems, ...apiItems];
  }, [demoItems, apiItems]);

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

  // Update conversation$ when selected conversation changes
  useObserveEffect(selectedConversation$, ({ value: selectedConversation }) => {
    conversation$.set(allConversations.find((conv) => conv.id === selectedConversation));
  });

  // Update conversation$ when available conversations change
  useEffect(() => {
    const selectedId = selectedConversation$.get();
    const selectedConversation = allConversations.find((conv) => conv.id === selectedId);
    conversation$.set(selectedConversation);
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

  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  // Connect panel refs to store
  useEffect(() => {
    setLeftPanelRef(leftPanelRef.current);
    setRightPanelRef(rightPanelRef.current);
    return () => {
      setLeftPanelRef(null);
      setRightPanelRef(null);
    };
  }, []);

  useEffect(() => {
    // Always hide right sidebar by default
    rightPanelRef.current?.collapse();
    // Hide left sidebar by default when no conversation is selected
    if (!selectedConversation$.get()) {
      leftPanelRef.current?.collapse();
    }
  }, []);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel
        ref={leftPanelRef}
        defaultSize={20}
        minSize={15}
        maxSize={30}
        collapsible
        collapsedSize={0}
        onCollapse={() => leftSidebarVisible$.set(false)}
        onExpand={() => leftSidebarVisible$.set(true)}
      >
        <LeftSidebar
          conversations={allConversations}
          selectedConversationId$={selectedConversation$}
          onSelectConversation={handleSelectConversation}
          isLoading={isLoading}
          isError={isError}
          error={error as Error}
          onRetry={() => refetch()}
          route={route}
        />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={60} minSize={30} className="overflow-hidden">
        <Memo>
          {() => {
            const conversation = conversation$.get();
            return conversation ? (
              <div className="h-full overflow-auto">
                <ConversationContent
                  conversationId={conversation.id}
                  isReadOnly={conversation.readonly}
                />
              </div>
            ) : (
              <div className="flex h-full flex-1 items-center justify-center p-4">
                <WelcomeView onToggleHistory={() => leftPanelRef.current?.expand()} />
              </div>
            );
          }}
        </Memo>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel
        ref={rightPanelRef}
        defaultSize={20}
        minSize={15}
        maxSize={40}
        collapsible
        collapsedSize={0}
        onCollapse={() => rightSidebarVisible$.set(false)}
        onExpand={() => rightSidebarVisible$.set(true)}
      >
        <Memo>
          {() => {
            const conversation = conversation$.get();
            return conversation ? <RightSidebar conversationId={conversation.id} /> : null;
          }}
        </Memo>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default Conversations;
