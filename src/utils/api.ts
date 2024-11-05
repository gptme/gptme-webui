const DEFAULT_API_URL = "http://127.0.0.1:5000";

// Add DOM types
type RequestInit = globalThis.RequestInit;
type Response = globalThis.Response;

interface ApiMessage {
  role: string;
  content: string;
  timestamp?: string;
}

interface ApiError extends Error {
  status?: number;
}

export class ApiClient {
  public baseUrl: string;
  private _isConnected: boolean = false;
  private controller: AbortController | null = null;

  constructor(baseUrl: string = DEFAULT_API_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 5000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async fetchJson<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = new Error(
        `HTTP error! status: ${response.status}`
      ) as ApiError;
      error.status = response.status;
      throw error;
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
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api`,
        {},
        3000
      );
      this._isConnected = response.ok;
      return this._isConnected;
    } catch {
      this._isConnected = false;
      return false;
    }
  }

  async getConversations(limit: number = 100): Promise<unknown[]> {
    if (!this._isConnected) {
      console.warn("ApiClient: Not connected, cannot fetch conversations");
      return [];
    }
    return this.fetchJson<unknown[]>(
      `${this.baseUrl}/api/conversations?limit=${limit}`
    );
  }

  async getConversation(logfile: string): Promise<unknown> {
    if (!this._isConnected) {
      return [];
    }
    try {
      return await this.fetchJson<unknown>(
        `${this.baseUrl}/api/conversations/${logfile}`,
        {
          signal: this.controller?.signal,
        }
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return [];
      }
      throw error;
    }
  }

  async createConversation(
    logfile: string,
    messages: ApiMessage[]
  ): Promise<unknown> {
    if (!this._isConnected) {
      throw new Error("Not connected to API");
    }
    try {
      return await this.fetchJson<unknown>(
        `${this.baseUrl}/api/conversations/${logfile}`,
        {
          method: "PUT",
          body: JSON.stringify({ messages }),
        }
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }
      throw error;
    }
  }

  async sendMessage(
    logfile: string,
    message: ApiMessage,
    branch: string = "main"
  ): Promise<unknown> {
    if (!this._isConnected) {
      throw new Error("Not connected to API");
    }
    try {
      return await this.fetchJson<unknown>(
        `${this.baseUrl}/api/conversations/${logfile}`,
        {
          method: "POST",
          body: JSON.stringify({
            ...message,
            branch,
          }),
          signal: this.controller?.signal,
        }
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
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
    branch: string = "main"
  ): Promise<void> {
    if (!this._isConnected) {
      throw new Error("Not connected to API");
    }
    await this.cancelPendingRequests();

    // Create new controller for this request
    this.controller = new AbortController();
    let cleanup: (() => void) | undefined;

    try {
      const response = await fetch(
        `${this.baseUrl}/api/conversations/${logfile}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Connection": "keep-alive",
          },
          body: JSON.stringify({ model, branch, stream: true }),
          signal: this.controller?.signal,
        }
      );

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

      this.controller?.signal.addEventListener('abort', async () => {
        await cleanup?.();
      }, { once: true });

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));
            console.log("Parsed data:", data);

            if (data.error) {
              console.error("Error from SSE:", data.error);
              callbacks.onError?.(data.error);
              return;
            }

            if (data.stored === false) {
              callbacks.onToken?.(data.content);
            } else {
              const message: ApiMessage = {
                role: data.role,
                content: data.content,
                timestamp: new Date().toISOString(),
              };

              if (data.role === "system") {
                callbacks.onToolOutput?.(message);
              } else {
                callbacks.onComplete?.(message);
              }
            }
          } catch (e) {
            console.error("Error parsing SSE data:", e);
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

export const createApiClient = (baseUrl?: string): ApiClient => {
  return new ApiClient(baseUrl);
};
