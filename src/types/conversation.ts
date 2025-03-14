export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: string;
  files?: string[];
  id?: string; // Add back message ID
}

export interface ConversationSummary {
  name: string;
  modified: number;
  messages: number;
  branch?: string;
}

export interface ConversationDetails {
  name: string;
  modified: number;
  messages: Message[];
  branch?: string;
}

export interface GenerateCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (message: Message) => void;
  onToolOutput?: (message: Message) => void;
  onError?: (error: string) => void;
}
