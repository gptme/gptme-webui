import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ApiProvider } from "./contexts/ApiContext";
import Index from "./pages/Index";
import type { FC } from "react";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { createApiClient } from "./utils/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable automatic background refetching
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      // Reduce stale time to ensure updates are visible immediately
      staleTime: 0,
      // Keep cached data longer
      gcTime: 1000 * 60 * 5,
      // Ensure we get updates
      notifyOnChangeProps: 'all',
    },
    mutations: {
      // Ensure mutations trigger immediate updates
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
    },
  },
});

// Add debug logging
if (process.env.NODE_ENV === 'development') {
  queryClient.setDefaultOptions({
    queries: {
      onSuccess: (data) => {
        console.log('Query success:', data);
      },
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
  });
}

const AppContent: FC = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  useEffect(() => {
    const attemptInitialConnection = async () => {
      const api = createApiClient(apiUrl);
      const connected = await api.checkConnection();
      
      if (connected) {
        toast({
          title: "Connected",
          description: "Successfully connected to gptme instance",
        });
      }
    };

    attemptInitialConnection();
  }, [toast, apiUrl]);

  return (
    <ApiProvider baseUrl={apiUrl}>
      <BrowserRouter>
        <Index />
        <Toaster />
        <Sonner />
      </BrowserRouter>
    </ApiProvider>
  );
};

const App: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;