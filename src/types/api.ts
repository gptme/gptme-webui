import type { Message, StreamingMessage } from './conversation';

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

// Response from /api/conversations/<logfile>
export interface ConversationResponse {
  log: (Message | StreamingMessage)[];
  logfile: string;
  branches: Record<string, Message[]>;
}
