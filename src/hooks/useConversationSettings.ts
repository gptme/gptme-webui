import { useApi } from '@/contexts/ApiContext';
import { conversations$, updateConversation } from '@/stores/conversations';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, type FormSchema } from '@/schemas/conversationSettings';
import { toast } from 'sonner';
import type { ChatConfig } from '@/types/api';
import { useEffect } from 'react';
import { ToolFormat } from '@/types/api';

export const useConversationSettings = (conversationId: string) => {
  const api = useApi();
  const conversation$ = conversations$.get(conversationId);
  const chatConfig = conversation$?.chatConfig.get();

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

  const toolFields = useFieldArray({
    control: form.control,
    name: 'chat.tools',
  });

  const envFields = useFieldArray({
    control: form.control,
    name: 'chat.env',
  });

  const serverFields = useFieldArray({
    control: form.control,
    name: 'mcp.servers',
  });

  // Reset form when chatConfig loads or changes
  useEffect(() => {
    if (chatConfig) {
      console.log('Resetting form with chatConfig:', chatConfig);
      form.reset({
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
    }
  }, [chatConfig, form]);

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

    try {
      await api.updateChatConfig(conversationId, newConfig);

      const toolsChanged =
        JSON.stringify(originalTools?.slice().sort()) !==
        JSON.stringify(newConfig.chat.tools?.slice().sort());
      const mcpChanged =
        originalConfig.mcp?.enabled !== newConfig.mcp?.enabled ||
        originalConfig.mcp?.auto_start !== newConfig.mcp?.auto_start;
      const mcpServersChanged =
        JSON.stringify(originalConfig.mcp?.servers?.slice().sort()) !==
        JSON.stringify(newConfig.mcp?.servers?.slice().sort());

      if (toolsChanged || mcpChanged || mcpServersChanged) {
        const conversationData = await api.getConversation(conversationId);
        updateConversation(conversationId, { data: conversationData, chatConfig: newConfig });
      } else {
        updateConversation(conversationId, { chatConfig: newConfig });
      }
      toast.success('Settings updated successfully!');
    } catch (error) {
      console.error('Failed to update chat config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update settings: ${errorMessage}`);
    }
  };

  return {
    form,
    toolFields,
    envFields,
    serverFields,
    onSubmit,
    chatConfig,
  };
};
