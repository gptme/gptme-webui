import axios from 'axios';

const DEFAULT_API_URL = 'http://127.0.0.1:5000';

interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

interface Conversation {
  id: string;
  name: string;
  messages: Message[];
}

export class ApiClient {
  public baseUrl: string;
  public isConnected: boolean = false;

  constructor(baseUrl: string = DEFAULT_API_URL) {
    this.baseUrl = baseUrl;
    this.checkConnection();
  }

  async checkConnection() {
    try {
      console.log('ApiClient: Checking connection to:', this.baseUrl);
      const response = await fetch(`${this.baseUrl}/api`, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Add this to handle credentials if needed
      });
      
      console.log('ApiClient: Connection response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        cors: {
          mode: response.type,
          credentials: response.credentials,
        }
      });

      if (response.ok) {
        this.isConnected = true;
        console.log('ApiClient: Connection successful');
        return true;
      } else {
        this.isConnected = false;
        console.error('ApiClient: Connection failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('ApiClient: Connection error:', error);
      this.isConnected = false;
      return false;
    }
  }

  async getConversations(limit: number = 100) {
    const response = await axios.get(`${this.baseUrl}/api/conversations?limit=${limit}`);
    return response.data;
  }

  async getConversation(logfile: string) {
    const response = await axios.get(`${this.baseUrl}/api/conversations/${logfile}`);
    return response.data;
  }

  async createConversation(logfile: string, messages: Message[]) {
    const response = await axios.put(`${this.baseUrl}/api/conversations/${logfile}`, {
      messages,
    });
    return response.data;
  }

  async sendMessage(logfile: string, message: Message, branch: string = 'main') {
    const response = await axios.post(`${this.baseUrl}/api/conversations/${logfile}`, {
      ...message,
      branch,
    });
    return response.data;
  }

  async generateResponse(logfile: string, model?: string, branch: string = 'main') {
    const response = await axios.post(`${this.baseUrl}/api/conversations/${logfile}/generate`, {
      model,
      branch,
    });
    return response.data;
  }
}

export const createApiClient = (baseUrl?: string) => new ApiClient(baseUrl);