import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  GitPullRequest,
  GitMerge,
  Terminal,
  Edit,
  Trash2,
  Archive,
  Plus,
  Eye,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Task, TaskAction } from '@/types/task';

interface Props {
  task: Task;
}

const SuggestedActionsPanel: FC<Props> = ({ task }) => {
  const navigate = useNavigate();

  const getSuggestedActions = (task: Task): TaskAction[] => {
    const actions: TaskAction[] = [];

    switch (task.status) {
      case 'pending':
        // For pending tasks with conversations, show conversation and PR actions
        if (task.conversation_ids && task.conversation_ids.length > 0) {
          actions.push({
            id: 'view-conversation',
            label: 'View Conversation',
            description: 'Open the chat interface for this task',
            type: 'primary',
            icon: 'MessageSquare',
          });
        }

        // Add View PR action if PR exists for pending tasks
        if (task.git?.pr_url) {
          actions.push({
            id: 'view-pr',
            label: 'View Pull Request',
            description: 'Review the pull request',
            type: 'primary',
            icon: 'GitPullRequest',
          });
        }

        // Add workspace action if workspace exists
        if (task.workspace) {
          actions.push({
            id: 'open-workspace',
            label: 'Open Workspace',
            description: 'Access the task workspace in terminal',
            type: 'secondary',
            icon: 'Terminal',
          });
        }

        // Only show start task if no conversation exists yet
        if (!task.conversation_ids || task.conversation_ids.length === 0) {
          actions.push({
            id: 'start-task',
            label: 'Start Task',
            description: 'Begin working on this task',
            type: 'primary',
            icon: 'Play',
          });
        }

        actions.push(
          {
            id: 'edit-task',
            label: 'Edit Task',
            description: 'Modify task description or settings',
            type: 'secondary',
            icon: 'Edit',
          },
          {
            id: 'archive-task',
            label: 'Archive Task',
            description: 'Archive this task',
            type: 'destructive',
            icon: 'Archive',
          }
        );
        break;

      case 'active':
        actions.push(
          {
            id: 'view-conversation',
            label: 'View Conversation',
            description: 'Open the chat interface for this task',
            type: 'primary',
            icon: 'MessageSquare',
          },
          {
            id: 'open-workspace',
            label: 'Open Workspace',
            description: 'Access the task workspace in terminal',
            type: 'secondary',
            icon: 'Terminal',
          },
          {
            id: 'pause-task',
            label: 'Pause Task',
            description: 'Temporarily stop task execution',
            type: 'secondary',
            icon: 'Pause',
          }
        );

        // Add View PR action if PR exists for active tasks
        if (task.git?.pr_url) {
          actions.unshift({
            id: 'view-pr',
            label: 'View Pull Request',
            description: 'Review the pull request in progress',
            type: 'primary',
            icon: 'GitPullRequest',
          });
        }
        break;

      case 'completed':
        if (task.target_type === 'pr') {
          // Always show view PR action for completed PR tasks
          actions.push({
            id: 'view-pr',
            label: 'View Pull Request',
            description: task.git?.pr_merged
              ? 'View the merged pull request'
              : 'Review the completed pull request',
            type: 'primary',
            icon: 'GitPullRequest',
          });

          // Only show merge action if PR is not yet merged
          if (!task.git?.pr_merged && task.git?.pr_status === 'OPEN') {
            actions.push({
              id: 'merge-pr',
              label: 'Merge PR',
              description: 'Merge the pull request if ready',
              type: 'primary',
              icon: 'GitMerge',
            });
          }

          // Add archive action for completed tasks
          actions.push({
            id: 'archive-task',
            label: 'Archive Task',
            description: 'Archive this completed task',
            type: 'secondary',
            icon: 'Archive',
          });
        }
        break;

      case 'failed':
        actions.push(
          {
            id: 'retry-task',
            label: 'Retry Task',
            description: 'Restart the task from the beginning',
            type: 'primary',
            icon: 'RotateCcw',
          },
          {
            id: 'debug-workspace',
            label: 'Debug in Workspace',
            description: 'Open workspace to investigate the issue',
            type: 'secondary',
            icon: 'Terminal',
          },
          {
            id: 'view-logs',
            label: 'View Error Logs',
            description: 'Examine detailed error information',
            type: 'secondary',
            icon: 'AlertCircle',
          },
          {
            id: 'edit-and-retry',
            label: 'Edit & Retry',
            description: 'Modify task and try again',
            type: 'secondary',
            icon: 'Edit',
          }
        );
        break;
    }

    return actions;
  };

  const getActionIcon = (iconName: string) => {
    const icons = {
      Play: <Play className="h-4 w-4" />,
      Pause: <Pause className="h-4 w-4" />,
      RotateCcw: <RotateCcw className="h-4 w-4" />,
      MessageSquare: <MessageSquare className="h-4 w-4" />,
      GitPullRequest: <GitPullRequest className="h-4 w-4" />,
      GitMerge: <GitMerge className="h-4 w-4" />,
      Terminal: <Terminal className="h-4 w-4" />,
      Edit: <Edit className="h-4 w-4" />,
      Trash2: <Trash2 className="h-4 w-4" />,
      Archive: <Archive className="h-4 w-4" />,
      Plus: <Plus className="h-4 w-4" />,
      Eye: <Eye className="h-4 w-4" />,
      AlertCircle: <AlertCircle className="h-4 w-4" />,
      ExternalLink: <ExternalLink className="h-4 w-4" />,
      CheckCircle: <CheckCircle className="h-4 w-4" />,
      Copy: <Copy className="h-4 w-4" />,
    };
    return icons[iconName as keyof typeof icons] || <Play className="h-4 w-4" />;
  };

  const handleAction = (actionId: string) => {
    console.log(`Executing action: ${actionId} for task: ${task.id}`);

    switch (actionId) {
      case 'start-task':
        // Start the task
        break;
      case 'view-conversation':
        // Navigate to conversation view using React Router
        navigate(`/chat/${task.id}`);
        break;
      case 'open-workspace':
        // Navigate to workspace explorer
        navigate(`/workspace/${task.id}`);
        break;
      case 'view-pr':
        if (task.git?.pr_url) {
          // Open the specific PR URL
          window.open(task.git.pr_url, '_blank');
        } else if (task.target_repo) {
          // Fallback to repo's PR list
          window.open(`https://github.com/${task.target_repo}/pulls`, '_blank');
        }
        break;
      case 'retry-task':
        // Restart the task
        break;
      case 'debug-workspace':
        // Open workspace for debugging
        break;
      case 'edit-task':
        // Open edit dialog
        break;
      case 'archive-task':
        // Archive task with confirmation
        break;
      default:
        console.log(`Action ${actionId} not implemented yet`);
    }
  };

  const getQuickStats = (task: Task) => {
    const stats = [];

    if (task.status === 'active' && task.progress) {
      stats.push({
        label: 'Progress',
        value: `${task.progress.steps_completed}/${task.progress.total_steps}`,
        icon: <CheckCircle className="h-4 w-4" />,
      });
    }

    if (task.git?.branch) {
      stats.push({
        label: 'Branch',
        value: task.git.branch.split('/').pop() || task.git.branch,
        icon: <GitPullRequest className="h-4 w-4" />,
      });
    }

    if (task.target_repo) {
      stats.push({
        label: 'Repository',
        value: task.target_repo.split('/').pop() || task.target_repo,
        icon: <ExternalLink className="h-4 w-4" />,
      });
    }

    return stats;
  };

  const suggestedActions = getSuggestedActions(task);
  const quickStats = getQuickStats(task);
  const primaryActions = suggestedActions.filter((a) => a.type === 'primary');
  const secondaryActions = suggestedActions.filter((a) => a.type === 'secondary');
  const destructiveActions = suggestedActions.filter((a) => a.type === 'destructive');

  return (
    <div className="border-t border-border bg-muted/30">
      <div className="space-y-6 p-6">
        {/* Quick Stats */}
        {quickStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {quickStats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {stat.icon}
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <span className="text-sm font-medium">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggested Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Suggested Next Actions</CardTitle>
            <CardDescription>Actions based on the current task state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Actions */}
            {primaryActions.length > 0 && (
              <div className="space-y-2">
                {primaryActions.map((action) => (
                  <Button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    className="w-full justify-start"
                    size="sm"
                  >
                    {getActionIcon(action.icon || 'Play')}
                    <div className="ml-2 text-left">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs opacity-80">{action.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {/* Secondary Actions */}
            {secondaryActions.length > 0 && (
              <>
                {primaryActions.length > 0 && <Separator />}
                <div className="space-y-2">
                  {secondaryActions.map((action) => (
                    <Button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      {getActionIcon(action.icon || 'Play')}
                      <div className="ml-2 text-left">
                        <div className="font-medium">{action.label}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </>
            )}

            {/* Destructive Actions */}
            {destructiveActions.length > 0 && (
              <>
                {(primaryActions.length > 0 || secondaryActions.length > 0) && <Separator />}
                <div className="space-y-2">
                  {destructiveActions.map((action) => (
                    <Button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      variant="destructive"
                      className="w-full justify-start"
                      size="sm"
                    >
                      {getActionIcon(action.icon || 'Trash2')}
                      <div className="ml-2 text-left">
                        <div className="font-medium">{action.label}</div>
                        <div className="text-xs opacity-80">{action.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status-specific Tips */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Tip:</p>
                <p className="mt-1 text-blue-700">
                  {task.status === 'pending' &&
                    (task.git?.pr_url
                      ? 'Task work is complete. The PR is open and waiting for review or merge.'
                      : task.conversation_ids?.length
                        ? 'Task is in progress. Check the conversation for current status.'
                        : "Task is ready to start. Begin working on it when you're ready.")}
                  {task.status === 'active' &&
                    'You can view the conversation to see real-time progress and interact with the task.'}
                  {task.status === 'completed' &&
                    'Great job! Consider reviewing the results and creating follow-up tasks if needed.'}
                  {task.status === 'failed' &&
                    'Check the error details and workspace to understand what went wrong before retrying.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { SuggestedActionsPanel };
