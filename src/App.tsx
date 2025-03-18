import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from './contexts/ApiContext';
import Index from './pages/Index';
import type { FC } from 'react';

// Parse URL fragment parameters
const parseFragmentParams = () => {
  const hash = window.location.hash.substring(1); // Remove the # character
  const params = new URLSearchParams(hash);

  const baseUrl = params.get('baseUrl');
  const userToken = params.get('userToken');

  // Clean up the URL by removing the fragment if we found parameters
  if (baseUrl || userToken) {
    // Remove the fragment from the URL to avoid exposing sensitive data
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  return { baseUrl, userToken };
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
  const defaultBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  // Parse fragment parameters synchronously before first render
  const { baseUrl, userToken } = parseFragmentParams();

  // Use the base URL from the fragment if available, otherwise use the default
  const initialBaseUrl = baseUrl || defaultBaseUrl;

  return (
    <ApiProvider
      initialBaseUrl={initialBaseUrl}
      initialAuthToken={userToken}
      queryClient={queryClient}
    >
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
