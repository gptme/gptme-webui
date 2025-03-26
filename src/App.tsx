import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from './contexts/ApiContext';
import Index from './pages/Index';
import type { FC } from 'react';

// Get URL fragment parameters if they exist
const getFragmentParams = () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);

  // Clean fragment from URL if parameters were found
  if (params.has('baseUrl') || params.has('userToken')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  return {
    baseUrl: params.get('baseUrl') || undefined,
    userToken: params.get('userToken') || undefined,
  };
};

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

const AppContent: FC = () => {
  const { baseUrl, userToken } = getFragmentParams();

  return (
    <ApiProvider initialBaseUrl={baseUrl} initialAuthToken={userToken} queryClient={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
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
