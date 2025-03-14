import type { ApiClient } from '@/utils/api';
import { createApiClient } from '@/utils/api';
import type { QueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface ApiContextType {
  api: ApiClient;
  isConnected: boolean;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  authToken: string | null;
  setAuthToken: (header: string | null) => void;
  tryConnect: () => Promise<void>;
  // Add methods from ApiClient that are used in components
  getConversation: ApiClient['getConversation'];
  sendMessage: ApiClient['sendMessage'];
  generateResponse: ApiClient['generateResponse'];
  cancelPendingRequests: ApiClient['cancelPendingRequests'];
}

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({
  children,
  initialBaseUrl,
  initialAuthToken = null,
  queryClient,
}: {
  children: ReactNode;
  initialBaseUrl: string;
  initialAuthToken?: string | null;
  queryClient: QueryClient;
}) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [authToken, setAuthToken] = useState<string | null>(initialAuthToken);
  const [api, setApi] = useState(() =>
    createApiClient(initialBaseUrl, initialAuthToken ? `Bearer ${initialAuthToken}` : null)
  );
  const [isConnected, setIsConnected] = useState(false);

  // Attempt initial connection
  useEffect(() => {
    const attemptInitialConnection = async () => {
      try {
        console.log('Attempting initial connection to:', baseUrl);
        const connected = await api.checkConnection();
        console.log('Initial connection result:', connected);
        if (connected) {
          setIsConnected(true);
          console.log('Successfully connected to API');
        } else {
          console.log('Failed to connect to API - server may be down');
        }
      } catch (error) {
        console.error('Initial connection attempt failed:', error);
        setIsConnected(false);
      }
    };

    void attemptInitialConnection();
  }, [api, baseUrl]);

  const updateBaseUrl = async (newUrl: string) => {
    setBaseUrl(newUrl);
  };

  const updateAuthToken = (header: string | null) => {
    setAuthToken(header);
  };

  const tryConnect = async () => {
    try {
      const newApi = createApiClient(baseUrl, `Bearer ${authToken}`);
      const connected = await newApi.checkConnection();
      if (!connected) {
        throw new Error('Failed to connect to API');
      }
      newApi.setConnected(true); // Explicitly set connection state
      setApi(newApi);
      setIsConnected(true);
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({
        queryKey: ['conversations'],
        type: 'active',
      });
    } catch (error) {
      console.error('Failed to connect to API:', error);
      setIsConnected(false);
      throw error;
    }
  };

  return (
    <ApiContext.Provider
      value={{
        api,
        isConnected,
        baseUrl,
        setBaseUrl: updateBaseUrl,
        authToken,
        setAuthToken: updateAuthToken,
        tryConnect,
        // Forward methods from the API client
        getConversation: api.getConversation.bind(api),
        sendMessage: api.sendMessage.bind(api),
        generateResponse: api.generateResponse.bind(api),
        cancelPendingRequests: api.cancelPendingRequests.bind(api),
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
