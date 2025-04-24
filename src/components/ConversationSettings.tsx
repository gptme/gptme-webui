import { use$ } from '@legendapp/state/react';
import { conversations$, updateConversation } from '@/stores/conversations';
import { useEffect, useState, type FC } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { AVAILABLE_MODELS } from './ConversationContent';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChatConfig } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ToolFormat } from '@/types/api';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface ConversationSettingsProps {
  conversationId: string;
}

const mcpServerSchema = z.object({
  name: z.string().min(1, 'Server name cannot be empty'),
  enabled: z.boolean(),
  command: z.string().min(1, 'Command cannot be empty'),
  args: z.string(),
  env: z
    .array(
      z.object({
        key: z.string().min(1, 'Variable name cannot be empty'),
        value: z.string(),
      })
    )
    .optional(),
});

const formSchema = z.object({
  chat: z.object({
    model: z.string().optional(),
    tools: z.array(z.object({ name: z.string().min(1, 'Tool name cannot be empty') })).optional(),
    tool_format: z.nativeEnum(ToolFormat).nullable().optional(),
    stream: z.boolean(),
    interactive: z.boolean(),
    workspace: z.string().min(1, 'Workspace directory is required'),
    env: z
      .array(
        z.object({ key: z.string().min(1, 'Variable name cannot be empty'), value: z.string() })
      )
      .optional(),
  }),
  mcp: z.object({
    enabled: z.boolean(),
    auto_start: z.boolean(),
    servers: z.array(mcpServerSchema).optional(),
  }),
});

type FormSchema = z.infer<typeof formSchema>;

const defaultMcpServer: z.infer<typeof mcpServerSchema> = {
  name: '',
  enabled: true,
  command: '',
  args: '',
  env: [],
};

export const ConversationSettings: FC<ConversationSettingsProps> = ({ conversationId }) => {
  const api = useApi();
  const conversation$ = conversations$.get(conversationId);
  const chatConfig = use$(conversation$?.chatConfig);

  const [toolsOpen, setToolsOpen] = useState(false);

  console.log('chatConfig', chatConfig);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chat: {
        model: '',
        tools: [],
        tool_format: ToolFormat.MARKDOWN,
        stream: true,
        interactive: false,
        workspace: '',
        env: [],
      },
      mcp: {
        enabled: false,
        auto_start: false,
        servers: [],
      },
    },
  });

  const {
    handleSubmit,
    reset,
    control,
    register,
    formState: { isDirty, isSubmitting, errors },
    getValues,
    setValue,
  } = form;

  const {
    fields: toolFields,
    append: toolAppend,
    remove: toolRemove,
  } = useFieldArray({
    control,
    name: 'chat.tools',
  });

  const {
    fields: envFields,
    append: envAppend,
    remove: envRemove,
  } = useFieldArray({
    control,
    name: 'chat.env',
  });

  const {
    fields: serverFields,
    append: serverAppend,
    remove: serverRemove,
  } = useFieldArray({
    control,
    name: 'mcp.servers',
  });

  const [newToolName, setNewToolName] = useState('');
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newServerEnvInputs, setNewServerEnvInputs] = useState<
    Record<number, { key: string; value: string }>
  >({});

  // Reset form when chatConfig loads or changes
  useEffect(() => {
    if (chatConfig) {
      console.log('Resetting form with chatConfig:', chatConfig);
      reset({
        chat: {
          model: chatConfig.chat.model || '',
          tools: chatConfig.chat.tools?.map((tool) => ({ name: tool })) || [],
          tool_format: chatConfig.chat.tool_format || ToolFormat.MARKDOWN,
          stream: chatConfig.chat.stream ?? true,
          interactive: chatConfig.chat.interactive ?? false,
          workspace: chatConfig.chat.workspace || '',
          env: chatConfig.env
            ? Object.entries(chatConfig.env).map(([key, value]) => ({ key, value }))
            : [],
        },
        mcp: {
          enabled: chatConfig.mcp?.enabled ?? false,
          auto_start: chatConfig.mcp?.auto_start ?? false,
          servers:
            chatConfig.mcp?.servers?.map((server) => ({
              name: server.name || '',
              enabled: server.enabled ?? false,
              command: server.command || '',
              args: server.args?.join(', ') || '',
              env: server.env
                ? Object.entries(server.env).map(([key, value]) => ({ key, value }))
                : [],
            })) || [],
        },
      });
      const initialServerEnvState: Record<number, { key: string; value: string }> = {};
      (chatConfig.mcp?.servers || []).forEach((_, index) => {
        initialServerEnvState[index] = { key: '', value: '' };
      });
      setNewServerEnvInputs(initialServerEnvState);
    }
  }, [chatConfig, reset]);

  // Load the chat config if it's not already loaded
  useEffect(() => {
    if (!chatConfig) {
      api.getChatConfig(conversationId).then((config) => {
        updateConversation(conversationId, { chatConfig: config });
      });
    }
  }, [api, chatConfig, conversationId]);

  const onSubmit = async (values: FormSchema) => {
    const originalConfig = chatConfig;
    if (!originalConfig) {
      console.error('Original chatConfig not found, cannot submit.');
      toast.error('Cannot save settings: Original configuration missing.');
      return;
    }

    // Capture original tools for comparison later
    const originalTools = originalConfig.chat.tools;

    const toolsStringArray = values.chat.tools?.map((tool) => tool.name);
    const newTools = toolsStringArray?.length ? toolsStringArray : null;
    const newEnv =
      values.chat.env?.reduce(
        (acc, { key, value }) => {
          if (key.trim()) acc[key.trim()] = value;
          return acc;
        },
        {} as Record<string, string>
      ) || {};

    const newMcpServers = values.mcp?.servers?.map((server) => ({
      name: server.name,
      enabled: server.enabled,
      command: server.command,
      args: server.args
        .split(',')
        .map((arg) => arg.trim())
        .filter(Boolean),
      env:
        server.env?.reduce(
          (acc, { key, value }) => {
            if (key.trim()) acc[key.trim()] = value;
            return acc;
          },
          {} as Record<string, string>
        ) || {},
    }));

    const newConfig: ChatConfig = {
      ...originalConfig,
      chat: {
        ...originalConfig.chat,
        model: values.chat.model || null,
        tools: newTools,
        tool_format: values.chat.tool_format || null,
        stream: values.chat.stream,
        interactive: values.chat.interactive,
        workspace: values.chat.workspace,
      },
      env: newEnv,
      mcp: {
        enabled: values.mcp.enabled,
        auto_start: values.mcp.auto_start,
        servers: newMcpServers || [],
      },
    };

    console.log('Submitting new config:', JSON.stringify(newConfig, null, 2));

    try {
      // --- Attempt API Update ---
      await api.updateChatConfig(conversationId, newConfig);

      // --- Success: Check if tools changed ---
      const toolsChanged =
        JSON.stringify(originalTools?.slice().sort()) !==
        JSON.stringify(newConfig.chat.tools?.slice().sort());

      if (toolsChanged) {
        console.log('Tools changed, reloading conversation data...');
        const conversationData = await api.getConversation(conversationId);
        // Update with new conversation data *and* the new config
        updateConversation(conversationId, { data: conversationData, chatConfig: newConfig });
      } else {
        console.log('Tools unchanged, updating local config only.');
        // Only update the local config if tools didn't change
        updateConversation(conversationId, { chatConfig: newConfig });
      }
      toast.success('Settings updated successfully!');

      reset({
        chat: {
          model: newConfig.chat.model || '',
          tools: newConfig.chat.tools?.map((tool) => ({ name: tool })) || [],
          tool_format: newConfig.chat.tool_format || null,
          stream: newConfig.chat.stream,
          interactive: newConfig.chat.interactive,
          workspace: newConfig.chat.workspace,
          env: newConfig.env
            ? Object.entries(newConfig.env).map(([key, value]) => ({ key, value }))
            : [],
        },
        mcp: {
          enabled: newConfig.mcp.enabled,
          auto_start: newConfig.mcp.auto_start,
          servers:
            newConfig.mcp.servers?.map((server) => ({
              name: server.name || '',
              enabled: server.enabled ?? false,
              command: server.command || '',
              args: server.args?.join(', ') || '',
              env: server.env
                ? Object.entries(server.env).map(([key, value]) => ({ key, value }))
                : [],
            })) || [],
        },
      });
      const initialServerEnvState: Record<number, { key: string; value: string }> = {};
      (newConfig.mcp?.servers || []).forEach((_, index) => {
        initialServerEnvState[index] = { key: '', value: '' };
      });
      setNewServerEnvInputs(initialServerEnvState);
    } catch (error) {
      console.error('Failed to update chat config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update settings: ${errorMessage}`);

      reset({
        chat: {
          model: originalConfig.chat.model || '',
          tools: originalConfig.chat.tools?.map((tool) => ({ name: tool })) || [],
          tool_format: originalConfig.chat.tool_format || ToolFormat.MARKDOWN,
          stream: originalConfig.chat.stream ?? true,
          interactive: originalConfig.chat.interactive ?? false,
          workspace: originalConfig.chat.workspace || '',
          env: originalConfig.env
            ? Object.entries(originalConfig.env).map(([key, value]) => ({ key, value }))
            : [],
        },
        mcp: {
          enabled: originalConfig.mcp?.enabled ?? false,
          auto_start: originalConfig.mcp?.auto_start ?? false,
          servers:
            originalConfig.mcp?.servers?.map((server) => ({
              name: server.name || '',
              enabled: server.enabled ?? false,
              command: server.command || '',
              args: server.args?.join(', ') || '',
              env: server.env
                ? Object.entries(server.env).map(([key, value]) => ({ key, value }))
                : [],
            })) || [],
        },
      });
      const originalServerEnvState: Record<number, { key: string; value: string }> = {};
      (originalConfig.mcp?.servers || []).forEach((_, index) => {
        originalServerEnvState[index] = { key: '', value: '' };
      });
      setNewServerEnvInputs(originalServerEnvState);
    }
  };

  // Handler for adding a new tool
  const handleAddTool = () => {
    const trimmedName = newToolName.trim();
    if (trimmedName) {
      toolAppend({ name: trimmedName });
      setNewToolName('');
    }
  };

  // Handler for adding a new env var
  const handleAddEnvVar = () => {
    const trimmedKey = newEnvKey.trim();
    if (trimmedKey) {
      envAppend({ key: trimmedKey, value: newEnvValue });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const handleAddServer = () => {
    serverAppend(defaultMcpServer);
    setNewServerEnvInputs((prev) => ({ ...prev, [serverFields.length]: { key: '', value: '' } }));
  };

  const handleAddServerEnvVar = (serverIndex: number) => {
    const inputState = newServerEnvInputs[serverIndex];
    if (inputState && inputState.key.trim()) {
      const fieldArrayName = `mcp.servers.${serverIndex}.env` as const;
      const currentServerEnv = getValues(fieldArrayName) || [];
      setValue(fieldArrayName, [
        ...currentServerEnv,
        { key: inputState.key.trim(), value: inputState.value },
      ]);

      setNewServerEnvInputs((prev) => ({
        ...prev,
        [serverIndex]: { key: '', value: '' },
      }));
    }
  };

  const handleServerEnvInputChange = (
    serverIndex: number,
    field: 'key' | 'value',
    value: string
  ) => {
    setNewServerEnvInputs((prev) => ({
      ...prev,
      [serverIndex]: {
        ...(prev[serverIndex] || { key: '', value: '' }),
        [field]: value,
      },
    }));
  };

  return (
    <div className="pb-4">
      <div className="mb-4 text-sm text-muted-foreground">
        Settings for the current conversation
      </div>
      {chatConfig && (
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <h3 className="text-lg font-medium">Chat Configuration</h3>
            <FormField
              control={control}
              name="chat.model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stream Field */}
            <FormField
              control={control}
              name="chat.stream"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Stream Response</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Interactive Field */}
            <FormField
              control={control}
              name="chat.interactive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Interactive Mode</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Tool Format Field */}
            <FormField
              control={control}
              name="chat.tool_format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool Format</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value)}
                    value={field.value ?? ''}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tool format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ToolFormat).map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Workspace Field */}
            <FormField
              control={control}
              name="chat.workspace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Directory</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., /path/to/project or ."
                      {...field}
                      value={field.value || ''}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    The directory on the server where the agent can read/write files. Use '.' for
                    the default.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tools Field Array Section */}
            <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
              <FormItem>
                <CollapsibleTrigger>
                  <div className="flex w-full items-center justify-start">
                    <FormLabel>Tools</FormLabel>
                    {toolsOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                  <FormDescription className=" mt-4">
                    List of tool names the agent can use.
                  </FormDescription>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-0">
                    {toolFields.map((field, index) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <span className="flex-grow ">{field.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toolRemove(index)}
                          disabled={isSubmitting}
                          aria-label="Remove tool"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="my-2 flex items-center space-x-2">
                    <Input
                      placeholder="New tool name"
                      value={newToolName}
                      onChange={(e) => setNewToolName(e.target.value)}
                      disabled={isSubmitting}
                      onKeyDown={(e) => {
                        // Optional: Add tool on Enter press
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTool();
                        }
                      }}
                    />
                    <Button
                      type="button" // Prevent form submission
                      variant="outline"
                      onClick={handleAddTool}
                      disabled={!newToolName.trim() || isSubmitting}
                    >
                      Add Tool
                    </Button>
                  </div>
                </CollapsibleContent>
              </FormItem>
            </Collapsible>

            {/* Env Vars Field Array Section */}
            <FormItem>
              <FormLabel>Environment Variables</FormLabel>
              <div className="space-y-2">
                {envFields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Input
                      placeholder="Variable Name"
                      {...register(`chat.env.${index}.key`)}
                      className="w-1/3"
                      disabled={isSubmitting}
                    />
                    <Input
                      placeholder="Value"
                      {...register(`chat.env.${index}.value`)}
                      className="flex-grow"
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => envRemove(index)}
                      disabled={isSubmitting}
                      aria-label="Remove variable"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <Input
                  placeholder="New variable name"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  disabled={isSubmitting}
                  className="w-1/3"
                />
                <Input
                  placeholder="New variable value"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEnvVar();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddEnvVar}
                  disabled={!newEnvKey.trim() || isSubmitting}
                >
                  Add Variable
                </Button>
              </div>
              <FormDescription>
                Environment variables available to the agent and tools.
              </FormDescription>
              {errors.chat?.env && (
                <FormMessage>
                  {errors.chat.env.message || errors.chat.env.root?.message}
                </FormMessage>
              )}
            </FormItem>

            {/* MCP Configuration Section */}
            <h3 className="text-lg font-medium">MCP Configuration</h3>
            <FormField
              control={control}
              name="mcp.enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Enable MCP</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="mcp.auto_start"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Auto-Start MCP Servers</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>MCP Servers</FormLabel>
              <div className="space-y-4">
                {serverFields.map((serverField, serverIndex) => (
                  <div key={serverField.id} className="relative space-y-4 rounded-lg border p-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => serverRemove(serverIndex)}
                      disabled={isSubmitting}
                      aria-label="Remove Server"
                      className="absolute right-2 top-2 h-6 w-6"
                    >
                      {' '}
                      <X className="h-4 w-4" />{' '}
                    </Button>

                    <FormField
                      control={control}
                      name={`mcp.servers.${serverIndex}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Server Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., my_api_server"
                              {...field}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`mcp.servers.${serverIndex}.enabled`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Enabled</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`mcp.servers.${serverIndex}.command`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Command</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., python" {...field} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`mcp.servers.${serverIndex}.args`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arguments (comma-separated)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., -m, my_module, --port, 8000"
                              {...field}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel>Server Environment Variables</FormLabel>
                      <div className="space-y-2 border-l-2 pl-4">
                        {(getValues(`mcp.servers.${serverIndex}.env`) || []).map((_, envIndex) => (
                          <div
                            key={`${serverField.id}-env-${envIndex}`}
                            className="flex items-center space-x-2"
                          >
                            <Input
                              placeholder="Variable Name"
                              {...register(`mcp.servers.${serverIndex}.env.${envIndex}.key`)}
                              className="w-1/3"
                              disabled={isSubmitting}
                            />
                            <Input
                              placeholder="Value"
                              {...register(`mcp.servers.${serverIndex}.env.${envIndex}.value`)}
                              className="flex-grow"
                              disabled={isSubmitting}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center space-x-2 pl-4">
                        <Input
                          placeholder="New var name"
                          value={newServerEnvInputs[serverIndex]?.key || ''}
                          onChange={(e) =>
                            handleServerEnvInputChange(serverIndex, 'key', e.target.value)
                          }
                          disabled={isSubmitting}
                          className="w-1/3"
                        />
                        <Input
                          placeholder="New var value"
                          value={newServerEnvInputs[serverIndex]?.value || ''}
                          onChange={(e) =>
                            handleServerEnvInputChange(serverIndex, 'value', e.target.value)
                          }
                          disabled={isSubmitting}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddServerEnvVar(serverIndex);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddServerEnvVar(serverIndex)}
                          disabled={!newServerEnvInputs[serverIndex]?.key?.trim() || isSubmitting}
                        >
                          {' '}
                          Add Server Var{' '}
                        </Button>
                      </div>
                      {errors.mcp?.servers?.[serverIndex]?.env && (
                        <FormMessage>Error in server environment variables.</FormMessage>
                      )}
                    </FormItem>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddServer}
                className="mt-4"
                disabled={isSubmitting}
              >
                {' '}
                Add MCP Server{' '}
              </Button>
              <FormDescription> Configure external processes managed by MCP. </FormDescription>
              {errors.mcp?.servers && (
                <FormMessage>
                  {errors.mcp.servers.message || errors.mcp.servers.root?.message}
                </FormMessage>
              )}
            </FormItem>

            {/* Submit Button */}
            <hr />
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
};
