import axios from 'axios';

const DEFAULT_API_URL = 'http://127.0.0.1:5000';

interface ApiMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export class ApiClient {
  public baseUrl: string;
  private _isConnected: boolean = false;
  private controller: AbortController | null = null;

  constructor(baseUrl: string = DEFAULT_API_URL) {
    this.baseUrl = baseUrl;
  }

  // Changed to public so it can be accessed from ApiContext
  public cancelPendingRequests() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    this.controller = new AbortController();
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api`, {
        timeout: 3000,
      });
      this._isConnected = response.status === 200;
      return this._isConnected;
    } catch (error) {
      this._isConnected = false;
      return false;
    }
  }

  async getConversations(limit: number = 100): Promise<unknown[]> {
    if (!this._isConnected) {
      console.warn('ApiClient: Not connected, cannot fetch conversations');
      return [];
    }
    const response = await axios.get(`${this.baseUrl}/api/conversations?limit=${limit}`);
    return response.data;
  }

  async getConversation(logfile: string): Promise<unknown> {
    if (!this._isConnected) {
      return [];
    }
    this.cancelPendingRequests();
    try {
      const response = await axios.get(`${this.baseUrl}/api/conversations/${logfile}`, {
        signal: this.controller?.signal,
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return [];
      }
      throw error;
    }
  }

  async createConversation(logfile: string, messages: ApiMessage[]): Promise<unknown> {
    if (!this._isConnected) {
      throw new Error('Not connected to API');
    }
    try {
      const response = await axios.put(`${this.baseUrl}/api/conversations/${logfile}`, {
        messages,
      }, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return null;
      }
      throw error;
    }
  }

  async sendMessage(logfile: string, message: ApiMessage, branch: string = 'main'): Promise<unknown> {
    if (!this._isConnected) {
      throw new Error('Not connected to API');
    }
    this.cancelPendingRequests();
    try {
      const response = await axios.post(`${this.baseUrl}/api/conversations/${logfile}`, {
        ...message,
        branch,
      }, {
        signal: this.controller?.signal,
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return null;
      }
      throw error;
    }
  }

  async generateResponse(
    logfile: string,
    callbacks: {
      onToken?: (token: string) => void;
      onComplete?: (message: ApiMessage) => void;
      onToolOutput?: (message: ApiMessage) => void;
      onError?: (error: string) => void;
    },
    model?: string,
    branch: string = 'main'
  ): Promise<void> {
    if (!this._isConnected) {
      throw new Error('Not connected to API');
    }
    this.cancelPendingRequests();

    try {
      const response = await fetch(`${this.baseUrl}/api/conversations/${logfile}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, branch }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Starting stream reading...');
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('Stream complete');
          break;
        }

        const chunk = decoder.decode(value);
        console.log('Raw chunk received:', chunk);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines
          
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              console.log('Processing SSE data:', jsonStr);
              const data = JSON.parse(jsonStr);
              console.log('Parsed data:', data);

              if (data.error) {
                console.error('Error from SSE:', data.error);
                callbacks.onError?.(data.error);
                return;
              }

              if (data.stored === false) {
                // Streaming token from assistant
                console.log('Streaming token:', data.content);
                callbacks.onToken?.(data.content);
              } else {
                // Complete message or tool output
                const message: ApiMessage = {
                  role: data.role,
                  content: data.content,
                  timestamp: new Date().toISOString(),
                };

                if (data.role === 'system') {
                  console.log('Tool output received:', message);
                  callbacks.onToolOutput?.(message);
                } else {
                  console.log('Complete message received:', message);
                  callbacks.onComplete?.(message);
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      if (this.controller?.signal.aborted) {
        return;
      }
      throw error;
    }
  }
}

export const createApiClient = (baseUrl?: string): ApiClient => {
  return new ApiClient(baseUrl);
};