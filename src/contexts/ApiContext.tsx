import { createApiClient } from '@/utils/api';
import type { ApiClient } from '@/utils/api';
import { type Observable, observable } from '@legendapp/state';
import { use$, useObserveEffect } from '@legendapp/state/react';
import type { QueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';

interface ConnectionConfig {
  baseUrl: string;
  authToken: string | null;
  useAuthToken: boolean;
}

interface ApiContextType {
  api: ApiClient;
  isConnecting$: Observable<boolean>;
  isConnected$: Observable<boolean>;
  connectionConfig: ConnectionConfig;
  updateConfig: (config: Partial<ConnectionConfig>) => void;
  connect: (config?: Partial<ConnectionConfig>) => Promise<void>;
  // Methods from ApiClient that are used in components
  getConversation: ApiClient['getConversation'];
  sendMessage: ApiClient['sendMessage'];
  step: ApiClient['step'];
  confirmTool: ApiClient['confirmTool'];
  interruptGeneration: ApiClient['interruptGeneration'];
  cancelPendingRequests: ApiClient['cancelPendingRequests'];
  // Add event stream methods
  subscribeToEvents: ApiClient['subscribeToEvents'];
  closeEventStream: ApiClient['closeEventStream'];
  // Add session methods
  hasSession: ApiClient['hasSession'];
  getSessionId: ApiClient['getSessionId'];
}

const ApiContext = createContext<ApiContextType | null>(null);

export function connectionConfigFromHash(hash: string) {
  const params = new URLSearchParams(hash);

  // Get values from fragment
  const fragmentBaseUrl = params.get('baseUrl');
  const fragmentUserToken = params.get('userToken');

  // Save fragment values to localStorage if present
  if (fragmentBaseUrl) {
    localStorage.setItem('gptme_baseUrl', fragmentBaseUrl);
  }
  if (fragmentUserToken) {
    localStorage.setItem('gptme_userToken', fragmentUserToken);
  }

  // Clean fragment from URL if parameters were found
  if (fragmentBaseUrl || fragmentUserToken) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  // Get stored values
  const storedBaseUrl = localStorage.getItem('gptme_baseUrl');
  const storedUserToken = localStorage.getItem('gptme_userToken');

  return {
    baseUrl:
      fragmentBaseUrl || storedBaseUrl || import.meta.env.VITE_API_URL || 'http://127.0.0.1:5700',
    authToken: fragmentUserToken || storedUserToken || null,
    useAuthToken: Boolean(fragmentUserToken || storedUserToken),
  };
}

const connectionConfig$ = observable(connectionConfigFromHash(window.location.hash.substring(1)));

let api = createApiClient(
  connectionConfig$.baseUrl.get(),
  connectionConfig$.useAuthToken.get() && connectionConfig$.authToken.get()
    ? `Bearer ${connectionConfig$.authToken.get()}`
    : null
);
const isConnecting$ = observable(false);

const updateConfig = (newConfig: Partial<ConnectionConfig>) => {
  connectionConfig$.set((prev) => {
    const updated = { ...prev, ...newConfig };

    // Update localStorage
    localStorage.setItem('gptme_baseUrl', updated.baseUrl);
    if (updated.authToken && updated.useAuthToken) {
      localStorage.setItem('gptme_userToken', updated.authToken);
    } else {
      localStorage.removeItem('gptme_userToken');
    }

    return updated;
  });
};

export function ApiProvider({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  // Connect to API
  const connect = useCallback(
    async (config?: Partial<ConnectionConfig>) => {
      if (config) {
        // Update config if provided
        updateConfig(config);

        // Update API client if config has changed
        const { baseUrl, authToken, useAuthToken } = config;
        if (
          api.baseUrl !== baseUrl ||
          api.authHeader !== (useAuthToken && authToken ? `Bearer ${authToken}` : null)
        ) {
          console.log('[ApiContext] Creating new API client');
          api = createApiClient(baseUrl, useAuthToken && authToken ? `Bearer ${authToken}` : null);
          isConnecting$.set(false);
        }
      }

      if (api.isConnected$.get()) {
        console.log('[ApiContext] Already connected, skipping connection');
        return;
      }

      if (isConnecting$.get()) {
        console.log('[ApiContext] Already connecting, skipping connection');
        return;
      }

      console.log('[ApiContext] Connecting to API');
      isConnecting$.set(true);
      try {
        // Test connection
        const connected = await api.checkConnection();
        console.log('[ApiContext] Connected:', connected);
        if (!connected) {
          throw new Error('Failed to connect to API');
        }

        // Update state
        api.setConnected(true);

        // Refresh queries
        await queryClient.invalidateQueries();
        await queryClient.refetchQueries({
          queryKey: ['conversations'],
          type: 'active',
        });

        toast.success('Connected to gptme server');
      } catch (error) {
        console.error('Failed to connect to API:', error);
        api.setConnected(false);

        let errorMessage = 'Could not connect to gptme instance.';
        if (error instanceof Error) {
          if (error.message.includes('NetworkError') || error.message.includes('CORS')) {
            errorMessage +=
              ' CORS issue detected - ensure the server has CORS enabled and is accepting requests from ' +
              window.location.origin;
          } else {
            errorMessage += ' Error: ' + error.message;
          }
        }
        toast.error(errorMessage);
        throw error;
      } finally {
        isConnecting$.set(false);
      }
    },
    [queryClient]
  );

  // Attempt initial connection
  useEffect(() => {
    const attemptInitialConnection = async () => {
      console.log('[ApiContext] Attempting initial connection');
      try {
        // Always try to connect on startup
        await connect();
      } catch (error) {
        console.error('Initial connection attempt failed:', error);
        // Don't show toast for initial connection failure
      }
    };

    void attemptInitialConnection();
  }, [connect]);

  // Reconnect on config change
  useObserveEffect(connectionConfig$, async ({ value }) => {
    console.log('[ApiContext] Reconnecting on config change', value);
    await connect(value);
  });

  const connectionConfig = use$(connectionConfig$);

  return (
    <ApiContext.Provider
      value={{
        api,
        isConnecting$,
        isConnected$: api.isConnected$,
        connectionConfig,
        updateConfig,
        connect,
        // Forward methods from the API client
        getConversation: api.getConversation.bind(api),
        sendMessage: api.sendMessage.bind(api),
        step: api.step.bind(api),
        confirmTool: api.confirmTool.bind(api),
        interruptGeneration: api.interruptGeneration.bind(api),
        cancelPendingRequests: api.cancelPendingRequests.bind(api),
        subscribeToEvents: api.subscribeToEvents.bind(api),
        closeEventStream: api.closeEventStream.bind(api),
        // Add bindings for session methods
        hasSession: api.hasSession.bind(api),
        getSessionId: api.getSessionId.bind(api),
      }}
    >
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
