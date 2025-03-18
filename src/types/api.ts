import type { Message } from './conversation';

// Error response from any endpoint
export interface ApiError {
  error: string;
  status?: number;
}

// Request to create a conversation
export interface CreateConversationRequest {
  messages: Message[];
}

// Request to send a message
export interface SendMessageRequest extends Message {
  branch?: string;
}

// Request to generate a response
export interface GenerateRequest {
  model?: string;
  branch?: string;
  stream?: boolean;
}

// Response from /api/conversations/<logfile>
export interface ConversationResponse {
  log: Message[];
  logfile: string;
  branches: Record<string, Message[]>;
}
