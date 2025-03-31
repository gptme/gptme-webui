import { createApiClient } from '@/utils/api';
import type { ApiClient } from '@/utils/api';
import type { QueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface ConnectionConfig {
  baseUrl: string;
  authToken: string | null;
  useAuthToken: boolean;
}

interface ApiContextType {
  api: ApiClient;
  isConnected: boolean;
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

export function ApiProvider({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  // Initialize connection configuration
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>(() => {
    // Get URL fragment parameters if they exist
    const hash = window.location.hash.substring(1);
    return connectionConfigFromHash(hash);
  });

  const [api, setApi] = useState(() =>
    createApiClient(
      connectionConfig.baseUrl,
      connectionConfig.useAuthToken && connectionConfig.authToken
        ? `Bearer ${connectionConfig.authToken}`
        : null
    )
  );
  const [isConnected, setIsConnected] = useState(false);

  // Update connection configuration
  const updateConfig = useCallback((newConfig: Partial<ConnectionConfig>) => {
    setConnectionConfig((prev) => {
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
  }, []);

  // Connect to API
  const connect = useCallback(
    async (config?: Partial<ConnectionConfig>) => {
      try {
        // Update config if provided
        if (config) {
          updateConfig(config);
        }

        const { baseUrl, authToken, useAuthToken } = config || connectionConfig;

        // Create new API client
        const newApi = createApiClient(
          baseUrl,
          useAuthToken && authToken ? `Bearer ${authToken}` : null
        );

        // Test connection
        const connected = await newApi.checkConnection();
        if (!connected) {
          throw new Error('Failed to connect to API');
        }

        // Update state
        newApi.setConnected(true);
        setApi(newApi);
        setIsConnected(true);

        // Refresh queries
        await queryClient.invalidateQueries();
        await queryClient.refetchQueries({
          queryKey: ['conversations'],
          type: 'active',
        });

        toast.success('Connected to gptme server');
      } catch (error) {
        console.error('Failed to connect to API:', error);
        setIsConnected(false);

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
      }
    },
    [connectionConfig, queryClient, updateConfig]
  );

  // Attempt initial connection
  useEffect(() => {
    const attemptInitialConnection = async () => {
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

  return (
    <ApiContext.Provider
      value={{
        api,
        isConnected,
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
