import { type FC } from "react";
import { useState, useCallback, useEffect } from "react";
import { setDocumentTitle } from "@/utils/title";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MenuBar } from "@/components/MenuBar";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { ConversationContent } from "@/components/ConversationContent";
import { WelcomeView } from "@/components/WelcomeView";
import { useApi } from "@/contexts/ApiContext";
import type { ConversationItem } from "@/components/ConversationList";
import { toConversationItems } from "@/utils/conversation";
import { demoConversations, type DemoConversation } from "@/democonversations";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useConversation } from "@/hooks/useConversation";

interface Props {
  className?: string;
}

const Index: FC<Props> = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const conversationParam = searchParams.get('conversation');
  const [selectedConversation, setSelectedConversation] = useState<string>(
    conversationParam || demoConversations[0].name
  );
  const { api, isConnected, baseUrl } = useApi();
  const queryClient = useQueryClient();
  const { sendMessage } = useConversation();
  const { toast } = useToast();

  useEffect(() => {
    if (conversationParam) {
      setSelectedConversation(conversationParam);
    }
  }, [conversationParam]);

  const {
    data: apiConversations = [],
    isError,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["conversations", baseUrl, isConnected],
    queryFn: async () => {
      console.log("Fetching conversations, connection state:", isConnected);
      if (!isConnected) {
        console.warn("Attempting to fetch conversations while disconnected");
        return [];
      }
      try {
        const conversations = await api.getConversations();
        console.log("Fetched conversations:", conversations);
        return conversations;
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
        throw err;
      }
    },
    enabled: isConnected,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  if (isError) {
    console.error("Conversation query error:", error);
  }

  const allConversations: ConversationItem[] = [
    ...demoConversations.map((conv: DemoConversation) => ({
      name: conv.name,
      lastUpdated: conv.lastUpdated,
      messageCount: conv.messages.length,
      readonly: true,
    })),
    ...toConversationItems(apiConversations),
  ];

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === selectedConversation) {
        return;
      }
      queryClient.cancelQueries({
        queryKey: ["conversation", selectedConversation],
      });
      setSelectedConversation(id);
      navigate(`?conversation=${id}`);
    },
    [selectedConversation, queryClient, navigate]
  );

  const conversation = allConversations.find(
    (conv) => conv.name === selectedConversation
  );

  useEffect(() => {
    if (location.pathname === '/new') {
      setDocumentTitle('New Conversation');
    } else if (conversation) {
      setDocumentTitle(conversation.name);
    } else {
      setDocumentTitle();
    }
    return () => setDocumentTitle();
  }, [conversation, location.pathname]);

  const renderContent = () => {
    if (location.pathname === '/new') {
      return <WelcomeView onActionSelect={(message) => {
        if (isConnected) {
          const newId = Date.now().toString();
          api.createConversation(newId, [])
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
              navigate(`/?conversation=${newId}`);
              sendMessage(message);
            })
            .catch(() => {
              toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to create new conversation",
              });
            });
        } else {
          navigate('/?conversation=' + demoConversations[0].name);
        }
      }} />;
    }
    return <ConversationContent conversation={conversation} />;
  };

  return (
    <div className="h-screen flex flex-col">
      <MenuBar />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          isOpen={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          conversations={allConversations}
          selectedConversationId={selectedConversation}
          onSelectConversation={handleSelectConversation}
          isLoading={isLoading}
          isError={isError}
          error={error as Error}
          onRetry={() => refetch()}
        />
        {renderContent()}
        <RightSidebar
          isOpen={rightSidebarOpen}
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
      </div>
    </div>
  );
};

export default Index;
