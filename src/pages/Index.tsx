import { type FC } from "react";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MenuBar } from "@/components/MenuBar";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { ConversationContent } from "@/components/ConversationContent";
import { useApi } from "@/contexts/ApiContext";
import type { Conversation } from "@/types/conversation";
import { demoConversations, type DemoConversation } from "@/democonversations";

interface ApiConversation {
  name: string;
  modified: number;
  messages: number;
}

interface Props {
  className?: string;
}

const Index: FC<Props> = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string>(
    demoConversations[0].name
  );
  const api = useApi();
  const queryClient = useQueryClient();

  // Fetch conversations from API with proper caching
  const { data: apiConversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.getConversations(),
    enabled: api.isConnected,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Combine demo and API conversations
  const allConversations: Conversation[] = [
    ...demoConversations.map((conv: DemoConversation) => ({
      name: conv.name,
      lastUpdated: conv.lastUpdated,
      messageCount: conv.messages.length,
      readonly: true,
    })),
    ...apiConversations.map((conv: ApiConversation) => ({
      name: conv.name,
      lastUpdated: new Date(conv.modified * 1000),
      messageCount: conv.messages,
    })),
  ];

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === selectedConversation) {
        return;
      }
      // Cancel any pending queries for the previous conversation
      queryClient.cancelQueries({
        queryKey: ["conversation", selectedConversation],
      });
      setSelectedConversation(id);
    },
    [selectedConversation, queryClient]
  );

  const conversation = allConversations.find(
    (conv) => conv.name === selectedConversation
  );

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
        />
        <ConversationContent conversation={conversation} />
        <RightSidebar
          isOpen={rightSidebarOpen}
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
      </div>
    </div>
  );
};

export default Index;
