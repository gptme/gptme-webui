import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type FC,
  type ReactNode,
} from "react";
import { createApiClient } from "../utils/api";
import type { ApiClient } from "../utils/api";
import type { 
  ConversationSummary, 
  ConversationMessage, 
  GenerateCallbacks 
} from "../types/conversation";
import type { ConversationResponse } from "../types/api";

interface ApiContextType {
  baseUrl: string;
  isConnected: boolean;
  setBaseUrl: (url: string) => Promise<void>;
  checkConnection: () => Promise<boolean>;
  getConversations: () => Promise<ConversationSummary[]>;
  getConversation: (logname: string) => Promise<ConversationResponse>;
  createConversation: (
    logname: string,
    messages: ConversationMessage[]
  ) => Promise<{ status: string }>;
  sendMessage: (logname: string, message: ConversationMessage) => Promise<void>;
  generateResponse: (
    logname: string,
    callbacks: GenerateCallbacks,
    model?: string
  ) => Promise<void>;
  cancelPendingRequests: () => Promise<void>;
}

interface ApiProviderProps {
  children: ReactNode;
  baseUrl?: string;
}

const ApiContext = createContext<ApiContextType | null>(null);

export const ApiProvider: FC<ApiProviderProps> = ({ children, baseUrl }) => {
  const [client, setClient] = useState<ApiClient>(() =>
    createApiClient(baseUrl)
  );

  const setBaseUrl = useCallback(async (url: string) => {
    const newClient = createApiClient(url);
    try {
      await newClient.checkConnection();
      setClient(newClient);
    } catch (error) {
      console.error("Failed to connect to new API URL:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | undefined;

    const checkConnection = async () => {
      try {
        if (mounted) {
          const isConnected = await client.checkConnection();
          // Only schedule next check if still mounted and not connected
          if (mounted && !isConnected) {
            timeoutId = setTimeout(checkConnection, 60000); // Reduced frequency to 1 minute
          }
        }
      } catch (error) {
        console.error("Connection check failed:", error);
        if (mounted) {
          timeoutId = setTimeout(checkConnection, 60000);
        }
      }
    };

    void checkConnection();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      void client.cancelPendingRequests?.();
    };
  }, [client]);

  return (
    <ApiContext.Provider
      value={{
        baseUrl: client.baseUrl,
        isConnected: client.isConnected,
        setBaseUrl,
        checkConnection: client.checkConnection.bind(client),
        getConversations: client.getConversations.bind(client),
        getConversation: client.getConversation.bind(client),
        createConversation: client.createConversation.bind(client),
        sendMessage: client.sendMessage.bind(client),
        generateResponse: client.generateResponse.bind(client),
        cancelPendingRequests: client.cancelPendingRequests.bind(client),
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
};
