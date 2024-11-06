import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { ApiClient, createApiClient } from "@/utils/api";
import { QueryClient } from "@tanstack/react-query";

interface ApiContextType {
  api: ApiClient;
  isConnected: boolean;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
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
  queryClient,
}: {
  children: ReactNode;
  initialBaseUrl: string;
  queryClient: QueryClient;
}) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [api, setApi] = useState(() => createApiClient(initialBaseUrl));
  const [isConnected, setIsConnected] = useState(false);

  // Attempt initial connection
  useEffect(() => {
    const attemptInitialConnection = async () => {
      try {
        console.log("Attempting initial connection to:", baseUrl);
        const connected = await api.checkConnection();
        console.log("Initial connection result:", connected);
        if (connected) {
          setIsConnected(true);
          console.log("Successfully connected to API");
        } else {
          console.log("Failed to connect to API - server may be down");
        }
      } catch (error) {
        console.error("Initial connection attempt failed:", error);
        setIsConnected(false);
      }
    };

    void attemptInitialConnection();
  }, [api, baseUrl]);

  const updateBaseUrl = async (newUrl: string) => {
    try {
      setBaseUrl(newUrl);
      const newApi = createApiClient(newUrl);
      
      // Update connection status
      const connected = await newApi.checkConnection();
      if (!connected) {
        throw new Error("Failed to connect to API");
      }
      
      newApi.setConnected(true);  // Explicitly set connection state
      setApi(newApi);
      setIsConnected(true);
      
      // Invalidate and refetch all queries
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({
        queryKey: ["conversations"],
        type: "active",
      });
    } catch (error) {
      console.error("Failed to update API connection:", error);
      setIsConnected(false);
      throw error;  // Re-throw to handle in the UI
    }
  };

  return (
    <ApiContext.Provider
      value={{
        api,
        isConnected,
        baseUrl,
        setBaseUrl: updateBaseUrl,
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
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
}
