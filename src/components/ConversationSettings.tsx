import { useState, type FC } from 'react';
import { DeleteConversationConfirmationDialog } from './DeleteConversationConfirmationDialog';
import { Trash, Loader2 } from 'lucide-react';
import { AVAILABLE_MODELS } from './ConversationContent';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EnvironmentVariables } from './settings/EnvironmentVariables';
import { ToolsConfiguration } from './settings/ToolsConfiguration';
import { McpConfiguration } from './settings/McpConfiguration';
import { useConversationSettings } from '@/hooks/useConversationSettings';

interface ConversationSettingsProps {
  conversationId: string;
}

export const ConversationSettings: FC<ConversationSettingsProps> = ({ conversationId }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { form, toolFields, envFields, serverFields, onSubmit, chatConfig } =
    useConversationSettings(conversationId);

  const {
    handleSubmit,
    control,
    formState: { isDirty, isSubmitting },
  } = form;

  return (
    <div className="flex flex-col">
      {chatConfig && (
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex-1 space-y-8 overflow-y-auto pb-24">
              <h3 className="mt-4 text-lg font-medium">Chat Settings</h3>

              {/* Model Field */}
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

              {/* Environment Variables */}
              <EnvironmentVariables
                form={form}
                fieldArray={envFields}
                isSubmitting={isSubmitting}
                description="Environment variables available to the agent and tools."
              />

              {/* Tools Configuration */}
              <ToolsConfiguration form={form} toolFields={toolFields} isSubmitting={isSubmitting} />

              {/* MCP Configuration */}
              <McpConfiguration
                form={form}
                serverFields={serverFields}
                isSubmitting={isSubmitting}
              />

              {/* Advanced/rare toggles */}
              <h3 className="text-lg font-medium">Advanced Settings</h3>
              <div className="space-y-2 rounded-lg border px-3 py-2 shadow-sm">
                {/* Stream Field */}
                <FormField
                  control={control}
                  name="chat.stream"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
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
                    <FormItem className="flex flex-row items-center justify-between">
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
              </div>

              {/* Danger Zone */}
              <div className="mt-8 space-y-6">
                <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
                <div className="rounded-lg border-2 border-destructive/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Delete Conversation</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this conversation and all its messages.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="shrink-0"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="sticky bottom-0 mt-auto border-t bg-background p-4">
              <Button
                type="submit"
                disabled={!isDirty || isSubmitting}
                variant={isDirty ? 'default' : 'secondary'}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isDirty ? (
                  'Save Changes'
                ) : (
                  'Everything saved'
                )}
              </Button>
            </div>

            {/* Delete Dialog */}
            <DeleteConversationConfirmationDialog
              conversationName={conversationId}
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              onDelete={() => {
                window.location.href = '/';
              }}
            />
          </form>
        </Form>
      )}
    </div>
  );
};
