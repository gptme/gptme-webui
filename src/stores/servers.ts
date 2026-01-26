/**
 * Server registry store for multi-backend support (Phase 1)
 *
 * Manages multiple server configurations with one active at a time.
 * Persists to localStorage for cross-session continuity.
 */

import { observable } from '@legendapp/state';
import {
  type ServerConfig,
  type ServerRegistry,
  DEFAULT_SERVER_CONFIG,
  generateServerId,
} from '@/types/servers';

const STORAGE_KEY = 'gptme_servers';

/**
 * Load server registry from localStorage
 */
function loadServerRegistry(): ServerRegistry {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ServerRegistry;
      // Validate structure
      if (Array.isArray(parsed.servers) && parsed.servers.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[ServerStore] Failed to load servers from localStorage:', e);
  }

  // Check for legacy single-server config and migrate
  const legacyBaseUrl = localStorage.getItem('gptme_baseUrl');
  const legacyToken = localStorage.getItem('gptme_userToken');

  const defaultServer: ServerConfig = {
    id: generateServerId(),
    ...DEFAULT_SERVER_CONFIG,
    createdAt: Date.now(),
    lastUsedAt: null,
  };

  // Migrate legacy config if present
  if (legacyBaseUrl) {
    defaultServer.baseUrl = legacyBaseUrl;
    if (legacyToken) {
      defaultServer.authToken = legacyToken;
      defaultServer.useAuthToken = true;
    }
    defaultServer.name =
      legacyBaseUrl.includes('127.0.0.1') || legacyBaseUrl.includes('localhost')
        ? 'Local Server'
        : 'Migrated Server';
  }

  return {
    servers: [defaultServer],
    activeServerId: defaultServer.id,
  };
}

/**
 * Save server registry to localStorage
 */
function saveServerRegistry(registry: ServerRegistry): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn('[ServerStore] Failed to save servers to localStorage:', e);
  }
}

// Initialize the server registry store
const initialRegistry = loadServerRegistry();
export const serverRegistry$ = observable<ServerRegistry>(initialRegistry);

// Persist changes to localStorage
serverRegistry$.onChange(({ value }) => {
  if (value) {
    saveServerRegistry(value);
  }
});

/**
 * Get the currently active server config
 */
export function getActiveServer(): ServerConfig | null {
  const registry = serverRegistry$.get();
  if (!registry.activeServerId) return null;
  return registry.servers.find((s) => s.id === registry.activeServerId) || null;
}

/**
 * Get a server by ID
 */
export function getServerById(id: string): ServerConfig | null {
  const registry = serverRegistry$.get();
  return registry.servers.find((s) => s.id === id) || null;
}

/**
 * Set the active server by ID
 */
export function setActiveServer(serverId: string): void {
  const registry = serverRegistry$.get();
  const server = registry.servers.find((s) => s.id === serverId);
  if (!server) {
    console.warn('[ServerStore] Server not found:', serverId);
    return;
  }

  serverRegistry$.set({
    ...registry,
    activeServerId: serverId,
    servers: registry.servers.map((s) =>
      s.id === serverId ? { ...s, lastUsedAt: Date.now() } : s
    ),
  });
}

/**
 * Add a new server configuration
 */
export function addServer(
  config: Omit<ServerConfig, 'id' | 'createdAt' | 'lastUsedAt'>
): ServerConfig {
  const newServer: ServerConfig = {
    ...config,
    id: generateServerId(),
    createdAt: Date.now(),
    lastUsedAt: null,
  };

  const registry = serverRegistry$.get();
  serverRegistry$.set({
    ...registry,
    servers: [...registry.servers, newServer],
  });

  return newServer;
}

/**
 * Update an existing server configuration
 */
export function updateServer(
  serverId: string,
  updates: Partial<Omit<ServerConfig, 'id' | 'createdAt'>>
): void {
  const registry = serverRegistry$.get();
  serverRegistry$.set({
    ...registry,
    servers: registry.servers.map((s) => (s.id === serverId ? { ...s, ...updates } : s)),
  });
}

/**
 * Remove a server configuration
 */
export function removeServer(serverId: string): void {
  const registry = serverRegistry$.get();

  // Don't allow removing the last server
  if (registry.servers.length <= 1) {
    console.warn('[ServerStore] Cannot remove the last server');
    return;
  }

  const newServers = registry.servers.filter((s) => s.id !== serverId);
  const newActiveId =
    registry.activeServerId === serverId ? newServers[0]?.id || null : registry.activeServerId;

  serverRegistry$.set({
    servers: newServers,
    activeServerId: newActiveId,
  });
}

/**
 * Normalize URL for comparison (trim trailing slashes, lowercase)
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash from pathname
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString().toLowerCase();
  } catch {
    // If URL parsing fails, just normalize trailing slashes
    return url.replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Check if a server URL already exists (for duplicate prevention)
 */
export function serverUrlExists(baseUrl: string, excludeId?: string): boolean {
  const registry = serverRegistry$.get();
  const normalizedUrl = normalizeUrl(baseUrl);
  return registry.servers.some(
    (s) => normalizeUrl(s.baseUrl) === normalizedUrl && s.id !== excludeId
  );
}
