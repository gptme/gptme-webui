export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: string;
  files?: string[];
}

export interface StreamingMessage extends Message {
  isComplete: boolean;
}

export interface ToolUse {
  tool: string;
  args: string[];
  content: string;
}

export interface ConversationSummary {
  id: string;
  name: string;
  modified: number;
  messages: number;
  branch?: string;
  workspace?: string;
}

export interface GenerateCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (message: Message) => void;
  onToolOutput?: (message: Message) => void;
  onError?: (error: string) => void;
}
