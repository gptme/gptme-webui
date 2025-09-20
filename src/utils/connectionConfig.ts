const DEFAULT_API_URL = 'https://7f6ff8a1-1713-4a98-b07c-f60efde412fa-00-2wa8f9apyn8my.worf.replit.dev:8000';

export interface ConnectionConfig {
  baseUrl: string;
  authToken: string | null;
  useAuthToken: boolean;
}

export function getConnectionConfigFromSources(hash?: string): ConnectionConfig {
  const params = new URLSearchParams(hash || '');

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
  if ((fragmentBaseUrl || fragmentUserToken) && typeof window !== 'undefined') {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  // Get stored values
  const storedBaseUrl = localStorage.getItem('gptme_baseUrl');
  const storedUserToken = localStorage.getItem('gptme_userToken');

  // Check if stored baseUrl is using old localhost URLs and update to use Replit domain
  if (storedBaseUrl && (storedBaseUrl.includes('127.0.0.1') || storedBaseUrl.includes('localhost'))) {
    const updatedUrl = DEFAULT_API_URL;
    localStorage.setItem('gptme_baseUrl', updatedUrl);
    console.log('[connectionConfig] Updated cached baseUrl from localhost to Replit domain');
  }

  // Determine the final baseUrl with domain correction
  let finalBaseUrl = fragmentBaseUrl || storedBaseUrl || import.meta.env.VITE_API_URL || DEFAULT_API_URL;
  
  // Force correction of any URLs still pointing to localhost
  if (finalBaseUrl.includes('127.0.0.1') || finalBaseUrl.includes('localhost')) {
    finalBaseUrl = DEFAULT_API_URL;
    console.log('[connectionConfig] Corrected baseUrl from localhost to Replit domain');
  }

  return {
    baseUrl: finalBaseUrl,
    authToken: fragmentUserToken || storedUserToken || null,
    useAuthToken: Boolean(fragmentUserToken || storedUserToken),
  };
}

/**
 * Get the current API base URL from the same sources as the main API client
 */
export function getApiBaseUrl(): string {
  return getConnectionConfigFromSources().baseUrl;
}

/**
 * Get the current auth header from the same sources as the main API client
 */
export function getAuthHeader(): string | null {
  const config = getConnectionConfigFromSources();
  return config.useAuthToken && config.authToken ? `Bearer ${config.authToken}` : null;
}
