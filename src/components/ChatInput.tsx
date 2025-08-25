import { Send, Loader2, Settings, X, Bot, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useRef, type FC, type FormEvent, type KeyboardEvent } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { Badge } from '@/components/ui/badge';
import { ModelSelector } from '@/components/ModelSelector';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { type Observable } from '@legendapp/state';
import { Computed, use$ } from '@legendapp/state/react';
import { conversations$ } from '@/stores/conversations';
import { selectedAgent$, selectedWorkspace$ } from '@/stores/sidebar';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { WorkspaceSelector } from '@/components/WorkspaceSelector';
import type { WorkspaceProject, Agent } from '@/utils/workspaceUtils';
import { useModels } from '@/hooks/useModels';

export interface ChatOptions {
  model?: string;
  stream?: boolean;
  workspace?: string;
}

interface Props {
  conversationId?: string;
  onSend: (message: string, options?: ChatOptions) => void;
  onInterrupt?: () => Promise<void>;
  isReadOnly?: boolean;
  defaultModel?: string;
  autoFocus$: Observable<boolean>;
  hasSession$: Observable<boolean>;
  value?: string;
  onChange?: (value: string) => void;
}

interface ChatOptionsProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedWorkspace: string;
  setSelectedWorkspace: (workspace: string) => void;
  streamingEnabled: boolean;
  setStreamingEnabled: (enabled: boolean) => void;
  availableWorkspaces: WorkspaceProject[];
  isDisabled: boolean;
  showWorkspaceSelector: boolean;
  onAddWorkspace?: (path: string) => void;
}

const ChatOptionsPanel: FC<ChatOptionsProps> = ({
  selectedModel,
  setSelectedModel,
  selectedWorkspace,
  setSelectedWorkspace,
  streamingEnabled,
  setStreamingEnabled,
  availableWorkspaces,
  isDisabled,
  showWorkspaceSelector,
  onAddWorkspace,
}) => (
  <div className="space-y-8">
    <div className="space-y-1">
      <Label>Model</Label>
      <ModelSelector
        value={selectedModel}
        onValueChange={setSelectedModel}
        disabled={isDisabled}
        showFormField={false}
        placeholder="Select model"
      />
    </div>

    {showWorkspaceSelector && (
      <WorkspaceSelector
        selectedWorkspace={selectedWorkspace}
        onWorkspaceChange={setSelectedWorkspace}
        workspaces={availableWorkspaces}
        disabled={isDisabled}
        showConversationCount={true}
        allowCustomPath={true}
        onAddWorkspace={onAddWorkspace}
      />
    )}

    <StreamingToggle
      streamingEnabled={streamingEnabled}
      setStreamingEnabled={setStreamingEnabled}
      isDisabled={isDisabled}
    />
  </div>
);

const StreamingToggle: FC<{
  streamingEnabled: boolean;
  setStreamingEnabled: (enabled: boolean) => void;
  isDisabled: boolean;
}> = ({ streamingEnabled, setStreamingEnabled, isDisabled }) => (
  <div className="flex items-center justify-between">
    <Label htmlFor="streaming-toggle">Enable streaming</Label>
    <Switch
      id="streaming-toggle"
      checked={streamingEnabled}
      onCheckedChange={setStreamingEnabled}
      disabled={isDisabled}
    />
  </div>
);

const OptionsButton: FC<{ isDisabled: boolean; children: React.ReactNode }> = ({
  isDisabled,
  children,
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 rounded-sm px-1.5 text-[10px] text-muted-foreground transition-all hover:bg-accent hover:text-muted-foreground hover:opacity-100"
        disabled={isDisabled}
      >
        <Settings className="mr-0.5 h-2.5 w-2.5" />
        Options
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80" align="start">
      {children}
    </PopoverContent>
  </Popover>
);

const SubmitButton: FC<{ isGenerating: boolean; isDisabled: boolean }> = ({
  isGenerating,
  isDisabled,
}) => (
  <Button
    type="submit"
    className={`absolute bottom-2 right-2 rounded-full p-1 transition-colors ${
      isGenerating
        ? 'animate-[pulse_1s_ease-in-out_infinite] bg-red-600 p-3 hover:bg-red-700'
        : 'h-8 w-8 bg-green-600 text-green-100'
    }`}
    disabled={isDisabled}
  >
    {isGenerating ? (
      <div className="flex items-center gap-2">
        <span>Stop</span>
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    ) : (
      <Send className="h-3 w-3" />
    )}
  </Button>
);

const WorkspaceBadge: FC<{ workspace: string; onRemove: () => void }> = ({
  workspace,
  onRemove,
}) => {
  // Show a shortened version of the workspace path for better UX
  const displayName = workspace === '.' ? 'Current' : workspace.split('/').pop() || workspace;

  return (
    <Badge variant="secondary" className="flex items-center gap-1.5 pr-1">
      <div className="flex items-center gap-1.5">
        <Folder className="h-3 w-3" />
        <span className="text-xs" title={workspace}>
          {displayName}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-4 w-4 p-0 hover:bg-destructive/20"
      >
        <X className="h-2.5 w-2.5" />
      </Button>
    </Badge>
  );
};

const AgentBadge: FC<{ agent: Agent; onRemove: () => void }> = ({ agent, onRemove }) => (
  <Badge variant="secondary" className="flex items-center gap-1.5 pr-1">
    <div className="flex items-center gap-1.5">
      <Bot className="h-3 w-3" />
      <span className="text-xs">{agent.name}</span>
    </div>
    <Button
      variant="ghost"
      size="sm"
      onClick={onRemove}
      className="h-4 w-4 p-0 hover:bg-destructive/20"
    >
      <X className="h-2.5 w-2.5" />
    </Button>
  </Badge>
);

export const ChatInput: FC<Props> = ({
  conversationId,
  onSend,
  onInterrupt,
  isReadOnly,
  defaultModel = '',
  autoFocus$,
  hasSession$,
  value,
  onChange,
}) => {
  const { isConnected$ } = useApi();
  const sidebarSelectedWorkspace = use$(selectedWorkspace$);
  const sidebarSelectedAgent = use$(selectedAgent$);

  // Use dynamic models instead of static list
  const { defaultModel: apiDefaultModel } = useModels();

  // Get conversation config to read the actual model
  const conversation$ = conversationId ? conversations$.get(conversationId) : null;
  const conversationModel = conversation$?.chatConfig?.get()?.chat?.model;

  const [internalMessage, setInternalMessage] = useState('');
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState(
    conversationModel || defaultModel || apiDefaultModel || ''
  );

  // Update selectedModel when conversation config changes or apiDefaultModel changes
  useEffect(() => {
    if (conversationModel) {
      setSelectedModel(conversationModel);
    } else if (!defaultModel && apiDefaultModel && !selectedModel) {
      setSelectedModel(apiDefaultModel);
    }
  }, [conversationModel, defaultModel, apiDefaultModel, selectedModel]);

  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(
    // For new conversations, use the selected workspace from sidebar, otherwise default to '.'
    !conversationId && sidebarSelectedWorkspace
      ? sidebarSelectedWorkspace
      : !conversationId && sidebarSelectedAgent && sidebarSelectedAgent.path
        ? sidebarSelectedAgent.path
        : '.'
  );

  // Track whether workspace was explicitly selected (not derived from agent)
  const [workspaceExplicitlySelected, setWorkspaceExplicitlySelected] = useState(
    !conversationId && !!sidebarSelectedWorkspace
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isConnected = use$(isConnected$);

  // Get available workspaces using the reusable hook
  const { workspaces: availableWorkspaces, addCustomWorkspace } = useWorkspaces(false); // Don't fetch, just subscribe to cache changes

  const message = value !== undefined ? value : internalMessage;
  const setMessage = value !== undefined ? onChange || (() => {}) : setInternalMessage;

  const autoFocus = use$(autoFocus$);
  const conversation = conversationId ? use$(conversations$.get(conversationId)) : undefined;
  const isGenerating = conversation?.isGenerating || !!conversation?.executingTool;
  const hasSession = use$(hasSession$);

  const placeholder = isReadOnly
    ? 'This is a demo conversation (read-only)'
    : !isConnected
      ? 'Connect to gptme to send messages'
      : !hasSession
        ? 'Waiting for chat session to be established...'
        : 'Send a message...';

  const isDisabled = isReadOnly || !isConnected || !hasSession;

  // Focus the textarea when autoFocus is true and component is interactive
  useEffect(() => {
    if (autoFocus && textareaRef.current && !isReadOnly && isConnected) {
      textareaRef.current.focus();
      // Reset autoFocus$ to false after focusing
      autoFocus$.set(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, isReadOnly, isConnected]);

  // Update workspace when sidebar selection changes (only for new conversations)
  useEffect(() => {
    if (!conversationId && sidebarSelectedWorkspace) {
      setSelectedWorkspace(sidebarSelectedWorkspace);
      setWorkspaceExplicitlySelected(true);
    } else if (!conversationId && sidebarSelectedAgent && sidebarSelectedAgent.path) {
      setSelectedWorkspace(sidebarSelectedAgent.path);
      setWorkspaceExplicitlySelected(false); // Agent-derived workspace, not explicit
    } else if (!conversationId && !sidebarSelectedWorkspace && !sidebarSelectedAgent) {
      setSelectedWorkspace('.');
      setWorkspaceExplicitlySelected(false);
    }
  }, [conversationId, sidebarSelectedWorkspace, sidebarSelectedAgent]);

  // Wrapper function for explicit workspace selection
  const handleWorkspaceChange = (workspace: string) => {
    setSelectedWorkspace(workspace);
    setWorkspaceExplicitlySelected(workspace !== '.');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isGenerating && onInterrupt) {
      console.log('[ChatInput] Interrupting generation...', { isGenerating });
      try {
        await onInterrupt();
        console.log('[ChatInput] Generation interrupted successfully', { isGenerating });
      } catch (error) {
        console.error('[ChatInput] Error interrupting generation:', error);
      }
    } else if (message.trim()) {
      onSend(message, {
        model: selectedModel === 'default' ? undefined : selectedModel,
        stream: streamingEnabled,
        workspace: selectedWorkspace || undefined,
      });
      setMessage('');
      // Reset textarea height to default by removing inline style
      if (textareaRef.current) {
        textareaRef.current.style.height = '';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();

      // If generating, interrupt
      if (isGenerating && onInterrupt) {
        console.log('[ChatInput] Escape pressed, interrupting generation...');
        onInterrupt();
      }

      // Always blur the input on Escape
      textareaRef.current?.blur();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-adjust height
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 400)}px`;
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="mx-auto flex max-w-2xl flex-col">
        <div className="flex">
          <Computed>
            {() => (
              <div className="relative flex flex-1">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  data-testid="chat-input"
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="max-h-[400px] min-h-[60px] resize-none overflow-y-auto pb-8 pr-16"
                  disabled={isDisabled}
                />

                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-2">
                  <OptionsButton isDisabled={isDisabled}>
                    <ChatOptionsPanel
                      selectedModel={selectedModel}
                      setSelectedModel={setSelectedModel}
                      selectedWorkspace={selectedWorkspace}
                      setSelectedWorkspace={handleWorkspaceChange}
                      streamingEnabled={streamingEnabled}
                      setStreamingEnabled={setStreamingEnabled}
                      availableWorkspaces={availableWorkspaces}
                      isDisabled={isDisabled}
                      showWorkspaceSelector={!conversationId}
                      onAddWorkspace={(path: string) => {
                        console.log('[ChatInput] Adding new workspace:', path);
                        addCustomWorkspace(path);
                      }}
                    />
                  </OptionsButton>

                  {/* Agent badge for new conversations */}
                  {!conversationId && sidebarSelectedAgent && (
                    <AgentBadge
                      agent={sidebarSelectedAgent}
                      onRemove={() => selectedAgent$.set(null)}
                    />
                  )}

                  {/* Workspace badge for new conversations */}
                  {!conversationId &&
                    selectedWorkspace &&
                    selectedWorkspace !== '.' &&
                    workspaceExplicitlySelected && (
                      <WorkspaceBadge
                        workspace={selectedWorkspace}
                        onRemove={() => {
                          setSelectedWorkspace('.');
                          setWorkspaceExplicitlySelected(false);
                        }}
                      />
                    )}
                </div>

                <SubmitButton isGenerating={isGenerating} isDisabled={isDisabled} />
              </div>
            )}
          </Computed>
        </div>
      </div>
    </form>
  );
};
