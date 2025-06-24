import { useMemo } from 'react';
import { useConversationsInfiniteQuery } from './useConversationsInfiniteQuery';
import { extractWorkspacesFromConversations } from '@/utils/workspaceUtils';
import type { WorkspaceProject } from '@/utils/workspaceUtils';

export function useWorkspaces(enabled = true): {
  workspaces: WorkspaceProject[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data: infiniteData, isLoading, error } = useConversationsInfiniteQuery(enabled);

  const workspaces = useMemo(() => {
    const conversationSummaries = infiniteData?.pages?.flatMap((page) => page.conversations) || [];

    console.log(
      '[useWorkspaces] Extracted workspaces from cache:',
      conversationSummaries.length,
      'conversations'
    );

    return extractWorkspacesFromConversations(conversationSummaries);
  }, [infiniteData]);

  return {
    workspaces,
    isLoading,
    error,
  };
}
