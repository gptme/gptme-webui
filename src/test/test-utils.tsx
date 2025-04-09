import { render, renderHook } from '@testing-library/react';
import { TestProviders } from './TestProviders';
import { store$ } from '@/stores/conversations';
import { useApi } from '@/contexts/ApiContext';

import { act } from '@testing-library/react';

// Get the API client from the context using hooks
function getApiClient() {
  const { result } = renderHook(() => useApi(), {
    wrapper: TestProviders,
  });
  return result.current.api;
}

// Custom render function
export async function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  window.history.pushState({}, 'Test page', route);

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(ui, { wrapper: TestProviders });
    // Wait for initial state updates
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  return result!;
}

// Wait for server to be connected
export async function waitForServerConnected(timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const client = getApiClient();

    // Check immediately first
    if (client.isConnected$.peek()) {
      resolve();
      return;
    }

    // If not connected, set up listener and try to connect
    const cleanup = client.isConnected$.onChange((connected) => {
      if (connected) {
        cleanup();
        resolve();
      } else if (Date.now() - startTime > timeout) {
        cleanup();
        reject(
          new Error(
            `Timeout waiting for server connection after ${timeout}ms. ` +
              'Make sure gptme-server is running on localhost:5700'
          )
        );
      }
    });

    // Connection is handled automatically by ApiContext

    // Set up timeout
    setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timeout waiting for server connection after ${timeout}ms. ` +
            'Make sure gptme-server is running on localhost:5700'
        )
      );
    }, timeout);
  });
}

// Wait for conversations to be loaded
export async function waitForConversationsLoaded(timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    // Check immediately first
    if (!store$.loading.isLoading.peek()) {
      resolve();
      return;
    }

    // If still loading, set up listener
    const cleanup = store$.loading.isLoading.onChange((isLoading) => {
      if (!isLoading) {
        cleanup();
        resolve();
      } else if (Date.now() - startTime > timeout) {
        cleanup();
        reject(
          new Error(
            `Timeout waiting for conversations to load after ${timeout}ms. ` +
              'Make sure gptme-server is running and responding on localhost:5700'
          )
        );
      }
    });

    // Set up timeout
    setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timeout waiting for conversations to load after ${timeout}ms. ` +
            'Make sure gptme-server is running and responding on localhost:5700'
        )
      );
    }, timeout);
  });
}

// Helper to check if server is running
export async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:5700/api');
    return response.ok;
  } catch (error) {
    return false;
  }
}
