export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp?: string;
  files?: string[];
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
  messages: ConversationMessage[];
  branch?: string;
}

export interface GenerateCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (message: ConversationMessage) => void;
  onToolOutput?: (message: ConversationMessage) => void;
  onError?: (error: string) => void;
}
