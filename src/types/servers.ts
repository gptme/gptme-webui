/**
 * Server configuration types for multi-backend support (Phase 1)
 *
 * Phase 1: Session-based switching - one active connection at a time
 * Phase 2 (future): Simultaneous connections with scoped conversations
 */

export interface ServerConfig {
  /** Unique identifier for this server config */
  id: string;
  /** User-friendly name for display */
  name: string;
  /** Base URL of the gptme server */
  baseUrl: string;
  /** Authentication token (optional) */
  authToken: string | null;
  /** Whether to use the auth token */
  useAuthToken: boolean;
  /** When this config was created */
  createdAt: number;
  /** When this config was last used */
  lastUsedAt: number | null;
}

export interface ServerRegistry {
  /** All configured servers */
  servers: ServerConfig[];
  /** ID of the currently active server */
  activeServerId: string | null;
}

/** Default local server configuration */
export const DEFAULT_SERVER_CONFIG: Omit<ServerConfig, 'id' | 'createdAt' | 'lastUsedAt'> = {
  name: 'Local Server',
  baseUrl: 'http://127.0.0.1:5700',
  authToken: null,
  useAuthToken: false,
};

/** Generate a unique server ID */
export function generateServerId(): string {
  return `server_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
