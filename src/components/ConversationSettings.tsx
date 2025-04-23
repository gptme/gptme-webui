import { use$ } from '@legendapp/state/react';
import { conversations$, updateConversation } from '@/stores/conversations';
import { useEffect, type FC } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { AVAILABLE_MODELS } from './ConversationContent';
import { useForm } from 'react-hook-form';
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
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ToolFormat } from '@/types/api';
import { toast } from 'sonner';

interface ConversationSettingsProps {
  conversationId: string;
}

const formSchema = z.object({
  chat: z.object({
    model: z.string().optional(),
    tools: z.string().optional(),
    tool_format: z.nativeEnum(ToolFormat).nullable().optional(),
    stream: z.boolean(),
    interactive: z.boolean(),
    workspace: z.string().min(1, 'Workspace directory is required'),
  }),
  // Add other top-level config keys if needed
});

type FormSchema = z.infer<typeof formSchema>;

export const ConversationSettings: FC<ConversationSettingsProps> = ({ conversationId }) => {
  const api = useApi();
  const conversation$ = conversations$.get(conversationId);
  const chatConfig = use$(conversation$?.chatConfig);

  console.log('chatConfig', chatConfig);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chat: {
        model: '',
        tools: '',
        tool_format: ToolFormat.MARKDOWN,
        stream: true,
        interactive: false,
        workspace: '',
      },
    },
  });

  const {
    handleSubmit,
    reset,
    control,
    formState: { isDirty, isSubmitting }, // Get form state
  } = form;

  // Reset form when chatConfig loads or changes
  useEffect(() => {
    if (chatConfig) {
      reset({
        chat: {
          model: chatConfig.chat.model || '',
          tools: chatConfig.chat.tools?.join(', ') || '',
          tool_format: chatConfig.chat.tool_format || ToolFormat.MARKDOWN,
          stream: chatConfig.chat.stream ?? true,
          interactive: chatConfig.chat.interactive ?? false,
          workspace: chatConfig.chat.workspace || '',
        },
      });
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

  // Renamed function, now handles form submission
  const onSubmit = async (values: FormSchema) => {
    // Capture the state *before* attempting the update
    const originalConfig = chatConfig;
    if (!originalConfig) {
      console.error('Original chatConfig not found, cannot submit.');
      toast.error('Cannot save settings: Original configuration missing.');
      return;
    }

    const toolsArray = values.chat.tools
      ? values.chat.tools
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : null;

    const newConfig: ChatConfig = {
      ...originalConfig,
      chat: {
        ...originalConfig.chat,
        model: values.chat.model || null,
        tools: toolsArray,
        tool_format: values.chat.tool_format || null,
        stream: values.chat.stream,
        interactive: values.chat.interactive,
        workspace: values.chat.workspace,
      },
    };

    try {
      // --- Attempt API Update ---
      await api.updateChatConfig(conversationId, newConfig);

      // --- Success ---
      updateConversation(conversationId, { chatConfig: newConfig });
      // Reset form to the *new* state to clear dirty flag
      reset({
        chat: {
          model: newConfig.chat.model || '',
          tools: newConfig.chat.tools?.join(', ') || '',
          tool_format: newConfig.chat.tool_format || null,
          stream: newConfig.chat.stream,
          interactive: newConfig.chat.interactive,
          workspace: newConfig.chat.workspace,
        },
      });
      toast.success('Settings updated successfully!'); // Success toast
    } catch (error) {
      // --- Error Handling ---
      console.error('Failed to update chat config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update settings: ${errorMessage}`); // Error toast

      // Reset form back to the *original* state from before the submit attempt
      reset({
        chat: {
          model: originalConfig.chat.model || '',
          tools: originalConfig.chat.tools?.join(', ') || '',
          tool_format: originalConfig.chat.tool_format || ToolFormat.MARKDOWN, // Re-apply default logic if null
          stream: originalConfig.chat.stream ?? true, // Re-apply default logic if null
          interactive: originalConfig.chat.interactive ?? false, // Re-apply default logic if null
          workspace: originalConfig.chat.workspace || '', // Re-apply default logic if null
        },
      });
    }
  };

  return (
    <div className="pb-4">
      <div className="mb-4 text-sm text-muted-foreground">
        Settings for the current conversation
      </div>
      {chatConfig && (
        <Form {...form}>
          {/* Pass onSubmit to handleSubmit */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={control} // Use control from useForm
              name="chat.model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select
                    // Only update form state on change
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isSubmitting} // Disable while submitting
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

            {/* Tools Field */}
            <FormField
              control={control}
              name="chat.tools"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tools (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. tool1, tool2"
                      {...field}
                      value={field.value || ''} // Ensure controlled component
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
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
                      {/* Use a unique, non-empty value for the default/null option */}
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
                      value={field.value || ''} // Ensure controlled component
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

            {/* Add Save Button */}
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
