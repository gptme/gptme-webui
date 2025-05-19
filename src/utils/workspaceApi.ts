import type { FileType, FilePreview } from '@/types/workspace';
import { useApi } from '@/contexts/ApiContext';
import { useMemo } from 'react';

export function useWorkspaceApi() {
  const { api } = useApi();

  return useMemo(() => {
    async function listWorkspace(
      conversationId: string,
      path?: string,
      showHidden = false
    ): Promise<FileType[]> {
      const url = new URL(
        `/api/v2/conversations/${conversationId}/workspace${path ? `/${path}` : ''}`,
        api.baseUrl
      );
      url.searchParams.set('show_hidden', showHidden.toString());

      const response = await fetch(url, {
        headers: api.authHeader ? { Authorization: api.authHeader } : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to list workspace');
      }

      return response.json();
    }

    async function previewFile(conversationId: string, path: string): Promise<FilePreview> {
      const url = new URL(
        `/api/v2/conversations/${conversationId}/workspace/${path}/preview`,
        api.baseUrl
      );

      const response = await fetch(url, {
        headers: api.authHeader ? { Authorization: api.authHeader } : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to preview file');
      }

      const contentType = response.headers.get('Content-Type');
      if (contentType?.startsWith('image/')) {
        return {
          type: 'image',
          content: URL.createObjectURL(await response.blob()),
        };
      }

      return response.json();
    }

    return {
      listWorkspace,
      previewFile,
    };
  }, [api.baseUrl, api.authHeader]);
}
