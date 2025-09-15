const DEFAULT_API_URL = 'http://127.0.0.1:8000';

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

  return {
    baseUrl: fragmentBaseUrl || storedBaseUrl || import.meta.env.VITE_API_URL || DEFAULT_API_URL,
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
