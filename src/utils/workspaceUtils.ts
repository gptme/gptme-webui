import type { ConversationItem } from '@/components/ConversationList';

export interface WorkspaceProject {
  path: string;
  name: string;
  conversationCount: number;
  lastUsed: string;
}

export interface Agent {
  name: string;
  path: string;
  description?: string;
}

// For now, we'll use a simple heuristic to detect agents
// Agents might be workspaces with certain naming patterns or special files
export function isAgentWorkspace(path: string): boolean {
  // Simple heuristic: consider workspaces with "agent" in the name as agents
  const pathLower = path.toLowerCase();
  return (
    pathLower.includes('agent') || pathLower.includes('bot') || pathLower.includes('assistant')
  );
}

// Extract unique workspaces from conversation items
export function extractWorkspacesFromConversations(
  conversations: ConversationItem[]
): WorkspaceProject[] {
  const workspaceMap = new Map<string, WorkspaceProject>();

  console.log('[workspaceUtils] Processing conversations:', conversations.length);

  // Extract workspace information from conversation items
  for (const conversation of conversations) {
    if (!conversation.workspace) continue;

    const workspace = conversation.workspace;
    const name = workspace.split('/').pop() || workspace;
    const lastUsed = conversation.lastUpdated.toISOString();

    console.log(
      `[workspaceUtils] Found workspace: ${workspace} from conversation ${conversation.id}`
    );

    if (workspaceMap.has(workspace)) {
      const existing = workspaceMap.get(workspace)!;
      existing.conversationCount += 1;
      // Use the most recent timestamp
      if (new Date(lastUsed) > new Date(existing.lastUsed)) {
        existing.lastUsed = lastUsed;
      }
    } else {
      workspaceMap.set(workspace, {
        path: workspace,
        name,
        conversationCount: 1,
        lastUsed,
      });
    }
  }

  const result = Array.from(workspaceMap.values()).sort(
    (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
  );

  console.log('[workspaceUtils] Extracted workspaces:', result);
  return result;
}

// Format path by shortening home directory to ~
export function formatPath(path: string): string {
  if (!path) return path;

  // Get home directory - in browser environment, we'll use common patterns
  const homePatterns = ['/Users/', '/home/'];

  for (const homePattern of homePatterns) {
    const homeIndex = path.indexOf(homePattern);
    if (homeIndex === 0) {
      // Find the next slash after the username
      const nextSlashIndex = path.indexOf('/', homePattern.length);
      if (nextSlashIndex > 0) {
        // Replace the home directory part with ~
        return '~' + path.substring(nextSlashIndex);
      } else {
        // The path is just the home directory
        return '~';
      }
    }
  }

  return path;
}

// Get example agents for demonstration
export function getExampleAgents(): Agent[] {
  return [
    {
      name: 'Bob',
      path: '/agents/bob',
      description: 'Autonomous Builder-agent',
    },
    {
      name: 'Alice',
      path: '/agents/alice',
      description: 'Focused on writing and editing assistance',
    },
    {
      name: 'Neo',
      path: '/agents/neo',
      description: 'Escaping The Matrix',
    },
  ];
}
