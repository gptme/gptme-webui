import type {
  ConversationResponse,
  GenerateResponse,
  ApiError,
  SendMessageRequest,
  CreateConversationRequest,
} from '@/types/api';
import type { Message } from '@/types/conversation';

const DEFAULT_API_URL = 'http://127.0.0.1:5000';

// Add DOM types
type RequestInit = globalThis.RequestInit;
type Response = globalThis.Response;

// Error type for API client
class ApiClientError extends Error {
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

export class ApiClient {
  public baseUrl: string;
  public authHeader: string | null = null;
  private _isConnected: boolean = false;
  private controller: AbortController | null = null;

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

    const headers = {
      ...options.headers,
    };
    
    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
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
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
    } else {
      console.log('No Authorization header available for request');
    }
    
    console.log('Request headers:', headers);
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new ApiClientError(`HTTP error! status: ${response.status}`, response.status);
    }

    return response.json();
  }

  // Changed to public so it can be accessed from ApiContext
  private isCleaningUp = false;

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
    } finally {
      this.isCleaningUp = false;
    }
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async checkConnection(): Promise<boolean> {
    try {
      // First try a basic connection check
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api`, {}, 3000);

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

  async getConversations(
    limit: number = 100
  ): Promise<{ name: string; modified: number; messages: number }[]> {
    if (!this._isConnected) {
      throw new ApiClientError('Not connected to API');
    }
    try {
      return await this.fetchJson<{ name: string; modified: number; messages: number }[]>(
        `${this.baseUrl}/api/conversations?limit=${limit}`
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
        `${this.baseUrl}/api/conversations/${logfile}`,
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

  async createConversation(logfile: string, messages: Message[]): Promise<{ status: string }> {
    if (!this._isConnected) {
      console.error('Attempted to create conversation while disconnected');
      throw new ApiClientError('Not connected to API');
    }
    try {
      const request: CreateConversationRequest = { messages };
      return await this.fetchJson<{ status: string }>(
        `${this.baseUrl}/api/conversations/${logfile}`,
        {
          method: 'PUT',
          body: JSON.stringify(request),
        }
      );
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
      await this.fetchJson<{ status: string }>(`${this.baseUrl}/api/conversations/${logfile}`, {
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

  async generateResponse(
    logfile: string,
    callbacks: {
      onToken?: (token: string) => void;
      onComplete?: (message: Message) => void;
      onToolOutput?: (message: Message) => void;
      onError?: (error: string) => void;
    },
    model?: string,
    branch: string = 'main'
  ): Promise<void> {
    if (!this._isConnected) {
      throw new Error('Not connected to API');
    }
    await this.cancelPendingRequests();

    // Create new controller for this request
    this.controller = new AbortController();
    let cleanup: (() => void) | undefined;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
      };
      
      if (this.authHeader) {
        headers['Authorization'] = this.authHeader;
      }
      
      const response = await fetch(`${this.baseUrl}/api/conversations/${logfile}/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, branch, stream: true }),
        signal: this.controller?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      cleanup = async () => {
        try {
          await reader.cancel();
          if (response.body) {
            await response.body.cancel();
          }
        } catch (e) {
          console.error('Error during cleanup:', e);
        }
      };

      this.controller?.signal.addEventListener(
        'abort',
        async () => {
          await cleanup?.();
        },
        { once: true }
      );

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6)) as GenerateResponse;

            if (isApiErrorResponse(data)) {
              console.error('Error from SSE:', data.error);
              callbacks.onError?.(data.error);
              return;
            }

            if (data.stored === false) {
              callbacks.onToken?.(data.content);
            } else {
              const message: Message = {
                role: data.role,
                content: data.content,
                timestamp: new Date().toISOString(),
              };

              if (data.role === 'system') {
                callbacks.onToolOutput?.(message);
              } else {
                callbacks.onComplete?.(message);
              }
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    } catch (error) {
      if (this.controller?.signal.aborted) {
        console.log('Request/stream aborted');
        return;
      }
      throw error;
    } finally {
      await cleanup?.();
    }
  }
}

export const createApiClient = (baseUrl?: string, authHeader?: string | null): ApiClient => {
  return new ApiClient(baseUrl, authHeader);
};
