import { createContext, useContext, useState, useCallback, useEffect, type FC, type ReactNode, type JSX } from 'react';
import { createApiClient } from '../utils/api';
import type { ApiClient } from '../utils/api';

interface Conversation {
  name: string;
  modified: number;
  messages: number;
}

interface ConversationMessage {
  role: string;
  content: string;
  timestamp?: string;
}

interface ApiContextType {
  baseUrl: string;
  isConnected: boolean;
  setBaseUrl: (url: string) => Promise<void>;
  checkConnection: () => Promise<boolean>;
  getConversations: () => Promise<Conversation[]>;
  getConversation: (logname: string) => Promise<ConversationMessage[]>;
  createConversation: (logname: string, messages: ConversationMessage[]) => Promise<void>;
  sendMessage: (logname: string, message: ConversationMessage) => Promise<void>;
  generateResponse: (
    logname: string,
    callbacks: {
      onToken?: (token: string) => void;
      onComplete?: (message: ConversationMessage) => void;
      onToolOutput?: (message: ConversationMessage) => void;
      onError?: (error: string) => void;
    },
    model?: string
  ) => Promise<void>;
}

interface ApiProviderProps {
  children: ReactNode;
  baseUrl?: string;
}

const ApiContext = createContext<ApiContextType | null>(null);

export const ApiProvider: FC<ApiProviderProps> = ({ children, baseUrl }): JSX.Element => {
  const [client, setClient] = useState<ApiClient>(() => createApiClient(baseUrl));

  const setBaseUrl = useCallback(async (url: string) => {
    const newClient = createApiClient(url);
    await newClient.checkConnection();
    setClient(newClient);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number;
    
    const checkConnection = async () => {
      try {
        if (mounted) {
          const isConnected = await client.checkConnection();
          // Only schedule next check if still mounted and not connected
          if (mounted && !isConnected) {
            timeoutId = window.setTimeout(checkConnection, 60000); // Reduced frequency to 1 minute
          }
        }
      } catch {
        if (mounted) {
          timeoutId = window.setTimeout(checkConnection, 60000);
        }
      }
    };

    checkConnection();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      client.cancelPendingRequests?.();
    };
  }, [client]);

  return (
    <ApiContext.Provider value={{
      baseUrl: client.baseUrl,
      isConnected: client.isConnected,
      setBaseUrl,
      checkConnection: client.checkConnection.bind(client),
      getConversations: client.getConversations.bind(client),
      getConversation: client.getConversation.bind(client),
      createConversation: client.createConversation.bind(client),
      sendMessage: client.sendMessage.bind(client),
      generateResponse: client.generateResponse.bind(client),
    }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};