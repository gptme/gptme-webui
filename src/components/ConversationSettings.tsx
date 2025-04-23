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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Assuming Select component exists
import type { ChatConfig } from '@/types/api'; // Corrected import path
import { Button } from '@/components/ui/button'; // Import Button
import { Loader2 } from 'lucide-react'; // Import Loader icon

interface ConversationSettingsProps {
  conversationId: string;
}

const formSchema = z.object({
  chat: z.object({
    model: z.string().optional(),
    // Add other config fields here if needed in the future
  }),
  // Add other top-level config keys if needed
});

type FormSchema = z.infer<typeof formSchema>;

export const ConversationSettings: FC<ConversationSettingsProps> = ({ conversationId }) => {
  const api = useApi();
  const conversation$ = conversations$.get(conversationId);
  const chatConfig = use$(conversation$?.chatConfig);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chat: {
        model: '',
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
      reset({ chat: { model: chatConfig.chat.model || '' } });
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
    if (!chatConfig) return;

    // Construct the new config based on form values
    const newConfig: ChatConfig = {
      ...chatConfig, // Keep existing config values
      chat: {
        ...chatConfig.chat, // Keep existing chat config values
        model: values.chat.model || null, // Update model from form
        // Update other fields from form values here if added
      },
      // Update other top-level keys from form values here if added
    };

    try {
      // TODO: Implement updateChatConfig in ApiClient (src/utils/api.ts)
      // await api.updateChatConfig(conversationId, newConfig);
      console.log('TODO: Call api.updateChatConfig', newConfig); // Placeholder

      // Simulate API delay for testing loader
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update local state after "successful" API call
      updateConversation(conversationId, { chatConfig: newConfig });
      reset({ chat: { model: newConfig.chat.model || '' } }); // Reset form to new state (marks it as not dirty)
      console.log('Settings updated (simulated)');
    } catch (error) {
      console.error('Failed to update chat config (API call commented out):', error);
      // Optionally show error message to user
    }
  };

  return (
    <div>
      <div className="mb-4 text-sm text-muted-foreground">
        Settings for the current conversation
      </div>
      {chatConfig && (
        <Form {...form}>
          {/* Pass onSubmit to handleSubmit */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {/* Add other settings fields here */}

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
