import type { ConversationSummary } from '@/types/conversation';
import type { ConversationItem } from '@/components/ConversationList';

/**
 * Convert an API ConversationSummary to a UI ConversationItem
 */
export function toConversationItem(conv: ConversationSummary): ConversationItem {
  return {
    id: conv.id,
    name: conv.name,
    lastUpdated: new Date(conv.modified * 1000), // Convert Unix timestamp to Date
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
