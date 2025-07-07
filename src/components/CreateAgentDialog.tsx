import { type FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, GitBranch, FolderOpen, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { ApiClientError } from '@/utils/api';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { selectedAgent$ } from '@/stores/sidebar';

export interface CreateAgentRequest {
  name: string;
  template_repo: string;
  template_branch: string;
  path: string;
  fork_command: string;
  project_config?: Record<string, unknown>;
}

export interface CreateAgentResponse {
  status: string;
  message: string;
  initial_conversation_id: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated: (agent: CreateAgentRequest) => Promise<{
    status: string;
    message: string;
    initial_conversation_id: string;
  }>;
}

const CreateAgentDialog: FC<Props> = ({ open, onOpenChange, onAgentCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CreateAgentRequest>({
    defaultValues: {
      name: '',
      template_repo: 'https://github.com/gptme/gptme-agent-template',
      template_branch: 'master',
      path: '',
      fork_command: './fork.sh <workspace-path> [<agent-name>]',
    },
  });

  const handleSubmit = async (data: CreateAgentRequest) => {
    if (
      !data.name.trim() ||
      !data.template_repo.trim() ||
      !data.template_branch.trim() ||
      !data.path.trim()
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await onAgentCreated(data);

      // Reset form
      form.reset();
      onOpenChange(false);

      toast.success('Agent created successfully!');

      // Refresh conversations data to include the new conversation
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // Set selected agent
      selectedAgent$.set({
        name: data.name,
        path: data.path,
        description: `Agent: ${data.name}`,
        conversationCount: 0,
        lastUsed: new Date().toISOString(),
      });

      // Navigate and force a refresh if needed
      const conversationId = response.initial_conversation_id;
      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Error creating agent:', error);

      let errorMessage = 'Failed to create agent. Please try again.';

      if (ApiClientError.isApiError(error)) {
        // Extract the actual error message from the server response
        errorMessage = `Failed to create agent: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Failed to create agent: ${error.message}`;
      }

      toast.error(errorMessage, {
        duration: 10000, // Show error longer so user can read it
        style: {
          maxWidth: '500px',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Create New Agent
          </DialogTitle>
          <DialogDescription>
            Set up a new specialized agent by forking a template repository with custom
            configuration.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Agent Name */}
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Agent name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Code Reviewer, Documentation Helper"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>A descriptive name for your agent</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template Repository Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Template Repository
                </CardTitle>
                <CardDescription>
                  Configure the repository template to fork for this agent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="template_repo"
                  rules={{ required: 'Template repository is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repository URL *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://github.com/username/template-repo"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        The git repository URL to clone as the agent template
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="template_branch"
                  rules={{ required: 'Template branch is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch *</FormLabel>
                      <FormControl>
                        <Input placeholder="main" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormDescription>
                        The branch to clone from the template repository
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Workspace Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Workspace Configuration
                </CardTitle>
                <CardDescription>Configure the agent's workspace directory</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="path"
                  rules={{ required: 'Workspace path is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace Path *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="/path/to/agent/workspace"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>The directory where the agent will operate</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Settings
                </CardTitle>
                <CardDescription>Configuration for post-setup commands</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="fork_command"
                  rules={{ required: 'Fork command is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fork Command *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="npm install && npm run setup"
                          {...field}
                          disabled={isLoading}
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Command to run after cloning the template. This should execute a script that
                        properly copies over the template files to the agent's workspace. E.g.
                        <code>./fork.sh &lt;workspace-path&gt; [&lt;agent-name&gt;]</code>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentDialog;
