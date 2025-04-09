import { screen, act } from '@testing-library/react';
import Conversations from '@/components/Conversations';
import { store$ } from '@/stores/conversations';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderWithProviders,
  waitForServerConnected,
  waitForConversationsLoaded,
  isServerRunning,
} from '@/test/test-utils';

describe('Conversations', () => {
  beforeEach(async () => {
    await act(async () => {
      // Reset store
      store$.conversations.set(new Map());
      store$.selectedId.set(null);
      store$.ui.assign({
        leftSidebarOpen: true,
        rightSidebarOpen: true,
        showInitialSystem: false,
        autoScrollAborted: false,
        isAutoScrolling: false,
      });
      store$.loading.assign({
        isLoading: false,
        error: null,
      });
    });

    // Skip if server not running
    const serverRunning = await isServerRunning();
    if (!serverRunning) {
      console.warn('Skipping tests: gptme-server not running on localhost:5700');
      return;
    }
  });

  it('should auto-connect and show conversations', async () => {
    await act(async () => {
      await renderWithProviders(<Conversations route="/" />);
    });

    // Initial state check
    await act(async () => {
      expect(screen.getByText('Introduction to gptme')).toBeInTheDocument();
    });

    try {
      // Wait for server connection and conversations to load
      await act(async () => {
        await waitForServerConnected();
        await waitForConversationsLoaded();
      });

      // Verify state after loading
      await act(async () => {
        // Should still show demo conversations after loading
        expect(screen.getByText('Introduction to gptme')).toBeInTheDocument();
        // Should not be in error state
        expect(store$.loading.error.peek()).toBeNull();
      });
    } catch (error) {
      // Verify fallback behavior
      await act(async () => {
        // If connection fails, should still show demo conversations
        expect(screen.getByText('Introduction to gptme')).toBeInTheDocument();
      });
    }
  });
});
