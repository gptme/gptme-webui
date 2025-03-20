import type {
  ApiError,
  ConversationResponse,
  CreateConversationRequest,
  SendMessageRequest,
} from '@/types/api';
import type { Message, ToolUse } from '@/types/conversation';

const DEFAULT_API_URL = 'http://127.0.0.1:5000';

// Add DOM types
type RequestInit = globalThis.RequestInit;
type Response = globalThis.Response;
type HeadersInit = globalThis.HeadersInit;

// Error type for API client
export class ApiClientError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = 'ApiClientError';
  }

  static isApiError(error: unknown): error is ApiClientError {
    return error instanceof ApiClientError;
  }
}

// Type guard for API error responses
function isApiErrorResponse(response: unknown): response is ApiError {
  return typeof response === 'object' && response !== null && 'error' in response;
}

export interface ToolPendingEvent {
  type: 'tool_pending';
  tool_id: string;
  tooluse: ToolUse;
  auto_confirm: boolean;
}

export interface ToolConfirmationRequest {
  session_id: string;
  tool_id: string;
  action: 'confirm' | 'edit' | 'skip' | 'auto';
  content?: string;
  count?: number;
}

export class ApiClient {
  public baseUrl: string;
  public authHeader: string | null = null;
  private _isConnected: boolean = false;
  private controller: AbortController | null = null;
  private sessions: Map<string, string> = new Map(); // Map conversation IDs to session IDs
  private eventSources: Map<string, EventSource> = new Map(); // Map conversation IDs to EventSource instances
  private isCleaningUp = false;

  constructor(baseUrl: string = DEFAULT_API_URL, authHeader: string | null = null) {
    this.baseUrl = baseUrl;
    this.authHeader = authHeader;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 5000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let headers = {
      ...options.headers,
    };

    if (this.authHeader) {
      headers = {
        ...headers,
        Authorization: this.authHeader,
      };
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      ...options.headers,
      'Content-Type': 'application/json',
    };

    if (this.authHeader) {
      (headers as Record<string, string>)['Authorization'] = this.authHeader;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new ApiClientError(`HTTP error! status: ${response.status}`, response.status);
    }

    const data = await response.json();

    // Check if the response is an error
    if (isApiErrorResponse(data)) {
      throw new ApiClientError(data.error, data.status);
    }

    return data as T;
  }

  public async cancelPendingRequests() {
    if (this.isCleaningUp) return;

    try {
      this.isCleaningUp = true;
      if (this.controller) {
        this.controller.abort();
        // Wait a bit for abort event handlers to complete
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 50);
        });
        this.controller = null;
      }

      // Close all event sources
      for (const [conversationId, eventSource] of this.eventSources.entries()) {
        eventSource.close();
        this.eventSources.delete(conversationId);
      }
    } finally {
      this.isCleaningUp = false;
    }
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Check the API
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/v2`, {}, 3000);

      if (!response.ok) {
        console.error('API endpoint returned non-OK status:', response.status);
        this._isConnected = false;
        return false;
      }

      // Try to parse the response to ensure it's valid JSON
      try {
        await response.json();
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        this._isConnected = false;
        return false;
      }

      this._isConnected = true;
      return true;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('Network error - server may be down or CORS not configured');
      } else {
        console.error('Connection check failed:', error);
      }
      this._isConnected = false;
      return false;
    }
  }

  // Add method to explicitly set connection state
  setConnected(connected: boolean) {
    if (connected && !this._isConnected) {
      console.warn('Manually setting connected state without verification');
    }
    this._isConnected = connected;
  }

  subscribeToEvents(
    conversationId: string,
    callbacks: {
      onMessageStart: () => void;
      onToken: (token: string) => void;
      onMessageComplete: (message: Message) => void;
      onMessageAdded: (message: Message) => void;
      onToolPending: (toolId: string, tooluse: ToolUse, auto_confirm: boolean) => void;
      onInterrupted: () => void;
      onError: (error: string) => void;
    }
  ): void {
    // Close any existing event stream for this conversation
    this.closeEventStream(conversationId);

    // Create a new event stream
    const url = `${this.baseUrl}/api/v2/conversations/${conversationId}/events`;
    console.log(`[ApiClient] Connecting to event stream: ${url}`);
    const eventSource = new EventSource(url);

    // Add connect event notification
    let isConnected = false;

    // Track reconnection attempts
    let reconnectCount = 0;
    const maxReconnects = 5;
    let reconnectTimer: number | null = null;

    // Handle connection open
    eventSource.onopen = () => {
      console.log(`[ApiClient] Event stream connected for ${conversationId}`);
      isConnected = true;
      reconnectCount = 0; // Reset reconnect count on successful connection
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Skip logging pings to avoid console spam
        //if (data.type !== 'ping') {
        //  console.log(`[ApiClient] Event received for ${conversationId}:`, {
        //    ...data,
        //    eventSourceUrl: eventSource.url,
        //  });
        //}

        switch (data.type) {
          case 'message_added':
            console.log(`[ApiClient] Message added:`, data.message);
            callbacks.onMessageAdded(data.message);
            break;

          case 'generation_started':
            console.log(`[ApiClient] Generation started`, data);
            callbacks.onMessageStart();
            break;

          case 'generation_progress':
            //console.log(`[ApiClient] Generation progress:`, data.token);
            callbacks.onToken(data.token);
            break;

          case 'generation_complete':
            console.log(`[ApiClient] Generation complete:`, data.message);
            callbacks.onMessageComplete(data.message);
            break;

          case 'tool_pending': {
            console.log(`[ApiClient] Tool pending:`, data);
            const pendingToolEvent = data as ToolPendingEvent;
            callbacks.onToolPending(
              pendingToolEvent.tool_id,
              pendingToolEvent.tooluse,
              pendingToolEvent.auto_confirm
            );
            break;
          }

          case 'tool_executing':
            console.log(`[ApiClient] Tool executing:`, data);
            break;

          case 'error':
            console.error(`[ApiClient] Error event:`, data);
            callbacks.onError(data.error);
            break;

          case 'ping':
            console.log(`[ApiClient] ping`);
            break;

          case 'connected':
            console.log(`[ApiClient] Session connected event:`, data);
            this.sessions.set(conversationId, data.session_id);
            break;

          case 'interrupted':
            callbacks.onInterrupted();
            break;

          default:
            console.warn(`[ApiClient] Unknown event type:`, data);
            break;
        }
      } catch (e) {
        console.error('Error parsing event data:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error(`[ApiClient] Event stream error for ${conversationId}:`, error);

      // If we were previously connected, try to reconnect
      if (isConnected) {
        console.log(`[ApiClient] Connection was established before, attempting to reconnect...`);
        isConnected = false;

        // Only auto-reconnect if we haven't exceeded the max reconnects
        if (reconnectCount < maxReconnects) {
          reconnectCount++;

          // Exponential backoff for reconnection (1s, 2s, 4s, 8s, 16s)
          const delay = Math.pow(2, reconnectCount - 1) * 1000;

          console.log(
            `[ApiClient] Reconnecting in ${delay}ms (attempt ${reconnectCount}/${maxReconnects})`
          );

          // Clear any existing timer
          if (reconnectTimer !== null) {
            window.clearTimeout(reconnectTimer);
          }

          // Set a new timer for reconnection
          reconnectTimer = window.setTimeout(() => {
            console.log(`[ApiClient] Attempting reconnection for ${conversationId}`);
            this.closeEventStream(conversationId);
            this.subscribeToEvents(conversationId, callbacks);
          }, delay);
        } else {
          console.warn(`[ApiClient] Max reconnects (${maxReconnects}) reached, giving up`);
          callbacks.onError?.('Connection lost and max reconnects reached');
        }
      } else {
        // We never established a connection, report the error
        callbacks.onError?.('Failed to connect to event stream');
      }
    };

    // Store the event source
    this.eventSources.set(conversationId, eventSource);
  }

  closeEventStream(conversationId: string): void {
    if (this.eventSources.has(conversationId)) {
      this.eventSources.get(conversationId)!.close();
      this.eventSources.delete(conversationId);
    }
  }

  async getConversations(
    limit: number = 100
  ): Promise<{ name: string; modified: number; messages: number }[]> {
    if (!this._isConnected) {
      throw new ApiClientError('Not connected to API');
    }
    try {
      return await this.fetchJson<{ name: string; modified: number; messages: number }[]>(
        `${this.baseUrl}/api/v2/conversations?limit=${limit}`
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError('Request aborted', 499);
      }
      throw error;
    }
  }

  async getConversation(logfile: string): Promise<ConversationResponse> {
    if (!this._isConnected) {
      throw new ApiClientError('Not connected to API');
    }
    try {
      const response = await this.fetchJson<ConversationResponse>(
        `${this.baseUrl}/api/v2/conversations/${logfile}`,
        {
          signal: this.controller?.signal,
        }
      );
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError('Request aborted', 499);
      }
      throw error;
    }
  }

  async createConversation(
    logfile: string,
    messages: Message[]
  ): Promise<{ status: string; session_id: string }> {
    if (!this._isConnected) {
      console.error('Attempted to create conversation while disconnected');
      throw new ApiClientError('Not connected to API');
    }
    try {
      const request: CreateConversationRequest = { messages };
      const response = await this.fetchJson<{
        status: string;
        session_id: string;
        conversation_id: string;
      }>(`${this.baseUrl}/api/v2/conversations/${logfile}`, {
        method: 'PUT',
        body: JSON.stringify(request),
      });

      // Store the session ID
      this.sessions.set(logfile, response.session_id);
      console.log(`[ApiClient] Stored session ID from createConversation: ${response.session_id}`);

      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError('Request aborted', 499);
      }
      console.error('Create conversation error:', error);
      throw error;
    }
  }

  async sendMessage(logfile: string, message: Message, branch: string = 'main'): Promise<void> {
    if (!this._isConnected) {
      throw new ApiClientError('Not connected to API');
    }
    try {
      const request: SendMessageRequest = { ...message, branch };
      await this.fetchJson<{ status: string }>(`${this.baseUrl}/api/v2/conversations/${logfile}`, {
        method: 'POST',
        body: JSON.stringify(request),
        signal: this.controller?.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError('Request aborted', 499);
      }
      throw error;
    }
  }

  async step(logfile: string, model?: string, branch: string = 'main'): Promise<void> {
    if (!this._isConnected) {
      throw new Error('Not connected to API');
    }

    // Only abort the previous step request if there is one
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }

    // Create new controller for this request
    this.controller = new AbortController();

    try {
      const sessionId = this.sessions.get(logfile);
      console.log(`[ApiClient] Using session ID for generation: ${sessionId}`);

      let headers: {
        [key: string]: string;
      } = {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
      };

      if (this.authHeader) {
        headers = {
          ...headers,
          Authorization: this.authHeader,
        };
      }

      // Start generation
      const request = await this.fetchJson<{ status: string; message: string; session_id: string }>(
        `${this.baseUrl}/api/v2/conversations/${logfile}/step`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ session_id: sessionId, model, branch }),
          signal: this.controller.signal,
        }
      );
      console.log(`[ApiClient] Generation started:`, request);
    } catch (error) {
      if (this.controller?.signal.aborted) {
        console.log('Generation request aborted');
        return;
      }
      throw error;
    }
  }

  async confirmTool(
    logfile: string,
    toolId: string,
    action: 'confirm' | 'edit' | 'skip' | 'auto',
    options?: {
      content?: string;
      count?: number;
    }
  ): Promise<void> {
    if (!this._isConnected) {
      throw new ApiClientError('Not connected to API');
    }

    console.log(`[ApiClient] Confirming tool: ${toolId}, action: ${action}`);

    try {
      // Get the session ID
      const sessionId = this.sessions.get(logfile);
      console.log(`[ApiClient] Using session for tool confirmation: ${sessionId}`);

      if (!sessionId) {
        throw new ApiClientError('Session ID not found for conversation', 404);
      }

      const request: ToolConfirmationRequest = {
        session_id: sessionId,
        tool_id: toolId,
        action,
      };

      if (action === 'edit' && options?.content) {
        request.content = options.content;
      } else if (action === 'auto' && options?.count) {
        request.count = options.count;
      }

      console.log(`[ApiClient] Sending tool confirmation request:`, request);

      await this.fetchJson<{ status: string }>(
        `${this.baseUrl}/api/v2/conversations/${logfile}/tool/confirm`,
        {
          method: 'POST',
          body: JSON.stringify(request),
          signal: this.controller?.signal,
        }
      );

      console.log(`[ApiClient] Tool confirmation successful`);
    } catch (error) {
      console.error(`[ApiClient] Tool confirmation failed:`, error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError('Request aborted', 499);
      }
      throw error;
    }
  }

  async interruptGeneration(logfile: string): Promise<void> {
    if (!this._isConnected) {
      throw new ApiClientError('Not connected to API');
    }

    try {
      // Get the session ID
      const sessionId = this.sessions.get(logfile);

      await this.fetchJson<{ status: string }>(
        `${this.baseUrl}/api/v2/conversations/${logfile}/interrupt`,
        {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
          signal: this.controller?.signal,
        }
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError('Request aborted', 499);
      }
      throw error;
    }
  }
}

export const createApiClient = (baseUrl?: string, authHeader?: string | null): ApiClient => {
  return new ApiClient(baseUrl, authHeader);
};
