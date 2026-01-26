import {
  addServer,
  setActiveServer,
  getActiveServer,
  updateServer,
  serverRegistry$,
} from '@/stores/servers';

const DEFAULT_API_URL = 'http://127.0.0.1:5700';

// Fleet operator URL for auth code exchange
// Configure via VITE_FLEET_OPERATOR_URL environment variable
const FLEET_OPERATOR_URL = import.meta.env.VITE_FLEET_OPERATOR_URL || 'https://fleet.gptme.ai';

export interface ConnectionConfig {
  baseUrl: string;
  authToken: string | null;
  useAuthToken: boolean;
}

export interface AuthCodeExchangeResult {
  userToken: string;
  instanceUrl: string;
  instanceId: string;
}

/**
 * Exchange an auth code for a user token via the fleet-operator.
 * This implements the secure auth code flow where tokens are never exposed in URLs.
 */
export async function exchangeAuthCode(
  code: string,
  exchangeUrl: string
): Promise<AuthCodeExchangeResult> {
  const response = await fetch(exchangeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.hint || error.error || `Auth code exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if URL hash contains auth code flow parameters.
 * Returns the code if present. Exchange URL is derived from configuration.
 */
function getAuthCodeParams(hash?: string): { code: string } | null {
  const params = new URLSearchParams(hash || '');
  const code = params.get('code');

  if (code) {
    return { code };
  }
  return null;
}

/**
 * Get the exchange URL for auth code flow.
 * Derives from VITE_FLEET_OPERATOR_URL environment variable.
 */
function getExchangeUrl(): string {
  return `${FLEET_OPERATOR_URL}/api/v1/operator/auth/exchange`;
}

/**
 * Normalize a URL for comparison (remove trailing slashes)
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Add or update server in registry from connection params.
 * Returns the server ID.
 */
function registerServerFromParams(baseUrl: string, authToken: string | null): string {
  const normalizedUrl = normalizeUrl(baseUrl);

  // Check if server already exists
  const registry = serverRegistry$.get();
  const existingServer = registry.servers.find((s) => normalizeUrl(s.baseUrl) === normalizedUrl);

  if (existingServer) {
    // Update existing server's auth token if provided
    if (authToken) {
      updateServer(existingServer.id, {
        authToken,
        useAuthToken: true,
      });
    }
    return existingServer.id;
  }

  // Add new server
  const isLocal = baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost');
  const serverName = isLocal ? 'Local Server' : 'Remote Server';

  const newServer = addServer({
    name: serverName,
    baseUrl: normalizedUrl,
    authToken,
    useAuthToken: Boolean(authToken),
  });

  return newServer.id;
}

export function getConnectionConfigFromSources(hash?: string): ConnectionConfig {
  const params = new URLSearchParams(hash || '');

  // Get values from fragment (legacy direct token flow)
  const fragmentBaseUrl = params.get('baseUrl');
  const fragmentUserToken = params.get('userToken');

  // If fragment params present, register server and set as active
  if (fragmentBaseUrl || fragmentUserToken) {
    const baseUrl = fragmentBaseUrl || getActiveServer()?.baseUrl || DEFAULT_API_URL;
    const serverId = registerServerFromParams(baseUrl, fragmentUserToken);
    setActiveServer(serverId);

    // Clean fragment from URL
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  // Return config from active server
  const activeServer = getActiveServer();
  if (activeServer) {
    return {
      baseUrl: activeServer.baseUrl,
      authToken: activeServer.authToken,
      useAuthToken: activeServer.useAuthToken,
    };
  }

  // Fallback to defaults
  return {
    baseUrl: import.meta.env.VITE_API_URL || DEFAULT_API_URL,
    authToken: null,
    useAuthToken: false,
  };
}

/**
 * Process URL hash for connection configuration.
 * Handles both legacy direct token flow and new auth code exchange flow.
 *
 * @returns ConnectionConfig after processing (may involve async exchange)
 */
export async function processConnectionFromHash(hash?: string): Promise<ConnectionConfig> {
  const authCodeParams = getAuthCodeParams(hash);

  if (authCodeParams) {
    // Auth code flow: exchange code for token
    console.log('[ConnectionConfig] Auth code flow detected, exchanging code...');

    try {
      const exchangeUrl = getExchangeUrl();
      const result = await exchangeAuthCode(authCodeParams.code, exchangeUrl);

      // Register server with exchanged credentials and set as active
      const serverId = registerServerFromParams(result.instanceUrl, result.userToken);
      setActiveServer(serverId);

      // Clean fragment from URL
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      console.log('[ConnectionConfig] Auth code exchanged successfully');

      return {
        baseUrl: result.instanceUrl,
        authToken: result.userToken,
        useAuthToken: true,
      };
    } catch (error) {
      console.error('[ConnectionConfig] Auth code exchange failed:', error);
      // Fall back to active server config on exchange failure
      const activeServer = getActiveServer();
      if (activeServer) {
        return {
          baseUrl: activeServer.baseUrl,
          authToken: activeServer.authToken,
          useAuthToken: activeServer.useAuthToken,
        };
      }

      // Ultimate fallback
      return {
        baseUrl: import.meta.env.VITE_API_URL || DEFAULT_API_URL,
        authToken: null,
        useAuthToken: false,
      };
    }
  }

  // No auth code, use sync path
  return getConnectionConfigFromSources(hash);
}

/**
 * Get the current API base URL from active server config.
 * Used by API utilities for making requests.
 */
export function getApiBaseUrl(): string {
  const activeServer = getActiveServer();
  return activeServer?.baseUrl || import.meta.env.VITE_API_URL || DEFAULT_API_URL;
}

/**
 * Get the auth header value if authentication is enabled.
 * Returns null if no auth token is configured or auth is disabled.
 */
export function getAuthHeader(): string | null {
  const activeServer = getActiveServer();
  if (activeServer?.useAuthToken && activeServer?.authToken) {
    return `Bearer ${activeServer.authToken}`;
  }
  return null;
}
