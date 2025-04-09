import type { ConversationSummary } from '@/types/conversation';
import type { ConversationItem } from '@/stores/conversations';

/**
 * Convert an API ConversationSummary to a UI ConversationItem
 */
export function toConversationItem(conv: ConversationSummary): ConversationItem {
  return {
    id: conv.name,
    lastUpdated: new Date(conv.modified), // API sends timestamps in milliseconds
    messageCount: conv.messages,
    readonly: false, // This could be determined by other factors
  };
}

/**
 * Convert an array of API ConversationSummary to UI ConversationItems
 */
export function toConversationItems(conversations: ConversationSummary[]): ConversationItem[] {
  return conversations.map(toConversationItem);
}
