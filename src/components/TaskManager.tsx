import { type FC, useState, useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  GitBranch,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TaskCreationDialog } from './TaskCreationDialog';
import { TaskDetails } from './TaskDetails';
import { SuggestedActionsPanel } from './SuggestedActionsPanel';
import { use$ } from '@legendapp/state/react';
import {
  selectedTask$,
  showArchived$,
  useTasksQuery,
  useTaskQuery,
  useCreateTaskMutation,
} from '@/stores/tasks';
import type { Task, TaskStatus, CreateTaskRequest } from '@/types/task';

interface Props {
  className?: string;
  selectedTaskId?: string;
}

const TaskManager: FC<Props> = ({ className, selectedTaskId: selectedTaskIdProp }) => {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const showArchived = use$(showArchived$);
  const selectedTaskId = use$(selectedTask$);

  // Use query hooks
  const { data: tasks = [], isLoading: loading, error, refetch } = useTasksQuery();
  const { data: selectedTask, isLoading: selectedTaskLoading } = useTaskQuery(
    selectedTaskId || null
  );
  const createTaskMutation = useCreateTaskMutation();

  // Handle task selection
  const handleTaskSelect = (task: Task) => {
    // Update URL to reflect selection
    navigate(`/tasks/${task.id}`, { replace: true });
    // Update store
    selectedTask$.set(task.id);
  };

  // Initialize selected task from URL parameter
  useEffect(() => {
    if (selectedTaskIdProp && selectedTaskIdProp !== selectedTaskId) {
      // Set the selected task from URL parameter
      selectedTask$.set(selectedTaskIdProp);
    }
  }, [selectedTaskIdProp, selectedTaskId]);

  // Handle task creation
  const handleTaskCreated = async (taskRequest: CreateTaskRequest) => {
    try {
      await createTaskMutation.mutateAsync(taskRequest);
      setShowCreateDialog(false);
      // The mutation will handle updating the store and setting selected task
      // Navigate to the new task (selectedTask$ will be updated by the mutation)
      if (selectedTaskId) {
        navigate(`/tasks/${selectedTaskId}`, { replace: true });
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'active':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    const variants = {
      pending: 'secondary',
      active: 'default',
      completed: 'secondary',
      failed: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const activeTasks = tasks.filter((t) => t.status === 'active' && !t.archived);
  const pendingTasks = tasks.filter((t) => t.status === 'pending' && !t.archived);
  const completedTasks = tasks.filter((t) => t.status === 'completed' && !t.archived);
  const failedTasks = tasks.filter((t) => t.status === 'failed' && !t.archived);
  const archivedTasks = tasks.filter((t) => t.archived);

  return (
    <div className={`flex h-full ${className}`}>
      <div className="flex flex-1">
        {/* Left Panel - Task List */}
        <div className="w-96 overflow-y-auto border-r border-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={showArchived ? 'default' : 'outline'}
                    onClick={() => showArchived$.set(!showArchived)}
                    className="flex items-center"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showArchived ? 'Hide Archived' : 'Show Archived'}</TooltipContent>
              </Tooltip>
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Card className="mb-4 border-red-200 bg-red-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Error loading tasks</span>
                </div>
                <p className="mt-1 text-xs text-red-600">
                  {error instanceof Error ? error.message : String(error)}
                </p>
                <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-2">
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && tasks.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading tasks...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && tasks.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <GitBranch className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <p className="mt-2 text-lg font-medium">No tasks yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first task to get started
                </p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Create Task
                </Button>
              </div>
            </div>
          )}

          {/* Task Status Summary */}
          {tasks.length > 0 && (
            <>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <span className="font-bold text-blue-600">{activeTasks.length}</span>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="font-bold text-yellow-600">{pendingTasks.length}</span>
                  </div>
                </Card>
              </div>

              <Separator className="mb-4" />
            </>
          )}

          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Active Tasks</h3>
              {activeTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onClick={() => handleTaskSelect(task)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}

          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Pending Tasks</h3>
              {pendingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onClick={() => handleTaskSelect(task)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Recently Completed</h3>
              {completedTasks.slice(0, 5).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onClick={() => handleTaskSelect(task)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}

          {/* Failed Tasks */}
          {failedTasks.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Failed Tasks</h3>
              {failedTasks.slice(0, 3).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onClick={() => handleTaskSelect(task)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}

          {/* Archived Tasks */}
          {showArchived && archivedTasks.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Archived Tasks</h3>
              {archivedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTask?.id === task.id}
                  onClick={() => handleTaskSelect(task)}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Task Details */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {selectedTask ? (
            <>
              <TaskDetails task={selectedTask} />
              <SuggestedActionsPanel task={selectedTask} />
            </>
          ) : selectedTaskId && selectedTaskLoading ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
                <p className="mb-2 text-lg">Loading task details...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <GitBranch className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="mb-2 text-lg">No task selected</p>
                <p className="text-sm">
                  Select a task from the list to view details and suggested actions
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <TaskCreationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
  getStatusIcon: (status: TaskStatus) => ReactElement;
  getStatusBadge: (status: TaskStatus) => ReactElement;
  formatDate: (date: string) => string;
}

const TaskCard: FC<TaskCardProps> = ({
  task,
  isSelected,
  onClick,
  getStatusIcon,
  getStatusBadge,
  formatDate,
}) => {
  return (
    <Card
      className={`mb-2 cursor-pointer transition-colors hover:bg-accent/50 ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(task.status)}
            {getStatusBadge(task.status)}
          </div>
          {task.target_type === 'pr' && <GitBranch className="h-4 w-4 text-muted-foreground" />}
        </div>

        <div className="space-y-1">
          <p className="line-clamp-2 text-sm font-medium">{task.content}</p>

          {task.target_repo && (
            <p className="text-xs text-muted-foreground">→ {task.target_repo}</p>
          )}

          {task.git?.branch && (
            <p className="text-xs text-muted-foreground">🌿 {task.git.branch}</p>
          )}

          {task.conversation && (
            <p className="text-xs text-muted-foreground">
              💬 {task.conversation.message_count} messages
            </p>
          )}

          {task.progress && task.status === 'active' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{task.progress.current_step}</p>
              <div className="h-1 w-full rounded-full bg-secondary">
                <div
                  className="h-1 rounded-full bg-primary transition-all"
                  style={{
                    width: `${((task.progress.steps_completed || 0) / (task.progress.total_steps || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{formatDate(task.created_at)}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export { TaskManager };
