import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ApiProvider } from '@/contexts/ApiContext';
// Create a queryClient for tests
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Don't retry failed requests
        retryDelay: 0,
        // Fail fast in tests
        gcTime: 1000,
      },
    },
  });
}

export function TestProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ApiProvider queryClient={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </ApiProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
