import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { PendingTool } from '@/stores/conversations';
import { Loader2, Play, Edit, SkipForward, Settings } from 'lucide-react';
import { type Observable, observable } from '@legendapp/state';
import { use$ } from '@legendapp/state/react';
import { CodeDisplay } from '@/components/CodeDisplay';
import { MessageAvatar } from './MessageAvatar';
import { detectToolLanguage } from '@/utils/highlightUtils';

interface InlineToolConfirmationProps {
  pendingTool$: Observable<PendingTool | null>;
  onConfirm: () => Promise<void>;
  onEdit: (content: string) => Promise<void>;
  onSkip: () => Promise<void>;
  onAuto: (count: number) => Promise<void>;
}

export function InlineToolConfirmation({
  pendingTool$,
  onConfirm,
  onEdit,
  onSkip,
  onAuto,
}: InlineToolConfirmationProps) {
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [autoConfirmCount, setAutoConfirmCount] = useState(5);
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const pendingTool = use$(pendingTool$);

  // Reset state when the pending tool changes
  React.useEffect(() => {
    if (pendingTool) {
      const content = pendingTool.tooluse.content;
      setEditedContent(content);
      setIsEditing(false);
      setConfirmLoading(false);
      setShowAutoConfirm(false);
    }
  }, [pendingTool]);

  const handleConfirm = React.useCallback(async () => {
    setConfirmLoading(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error confirming tool:', error);
    } finally {
      setConfirmLoading(false);
    }
  }, [onConfirm]);

  // Add keyboard handler for Enter key
  React.useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (
        pendingTool &&
        !isEditing &&
        e.key === 'Enter' &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        await handleConfirm();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [pendingTool, isEditing, handleConfirm]);

  const handleEdit = async () => {
    setConfirmLoading(true);
    try {
      await onEdit(editedContent);
    } catch (error) {
      console.error('Error confirming edited tool:', error);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await onSkip();
    } catch (error) {
      console.error('Error skipping tool:', error);
    }
  };

  const handleAuto = async () => {
    try {
      await onAuto(autoConfirmCount);
    } catch (error) {
      console.error('Error setting auto-confirm:', error);
    }
  };

  // Format args for display
  const formatArgs = (args: string[]) => {
    if (!args || args.length === 0) return 'No arguments';
    if (args.length === 1) return args[0];
    return args.map((arg, i) => `${i + 1}. ${arg}`).join('\n');
  };

  if (!pendingTool) return null;

  return (
    <div className="role-system mb-4 mt-4">
      <div className="mx-auto max-w-3xl px-4">
        <div className="relative">
          <MessageAvatar
            role$={observable('system' as const)}
            isError$={observable(false)}
            isSuccess$={observable(false)}
            chainType$={observable('standalone' as const)}
          />
          <div className="md:px-12">
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <div className="border-b border-amber-200 px-4 py-3 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">
                    Tool Execution Confirmation
                  </h3>
                </div>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  The assistant wants to execute a tool. Review the details and choose how to
                  proceed.
                </p>
              </div>

              <div className="space-y-4 p-4">
                {/* Tool Name */}
                <div className="flex items-center gap-3">
                  <span className="min-w-16 text-sm font-medium text-muted-foreground">Tool:</span>
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                    {pendingTool.tooluse.tool}
                  </code>
                </div>

                {/* Arguments */}
                {pendingTool.tooluse.args.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Arguments:</span>
                    <CodeDisplay
                      code={formatArgs(pendingTool.tooluse.args)}
                      maxHeight="120px"
                      showLineNumbers={false}
                    />
                  </div>
                )}

                {/* Code */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Code:</span>
                  {isEditing ? (
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      rows={Math.min(12, editedContent.split('\n').length + 2)}
                      className="resize-none font-mono text-sm"
                      placeholder="Edit the code to be executed..."
                    />
                  ) : (
                    <CodeDisplay
                      code={pendingTool.tooluse.content}
                      maxHeight="240px"
                      showLineNumbers={true}
                      language={detectToolLanguage(
                        pendingTool.tooluse.tool,
                        pendingTool.tooluse.args,
                        pendingTool.tooluse.content
                      )}
                    />
                  )}
                </div>

                {/* Auto-confirm option */}
                <div className="flex items-center space-x-2 border-t border-amber-200 pt-2 dark:border-amber-800">
                  <Checkbox
                    id="auto-confirm"
                    checked={showAutoConfirm}
                    onCheckedChange={(checked) => setShowAutoConfirm(checked as boolean)}
                  />
                  <Label htmlFor="auto-confirm" className="cursor-pointer text-sm">
                    Auto-confirm future tools
                  </Label>
                  {showAutoConfirm && (
                    <div className="ml-4 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Count:</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={autoConfirmCount}
                        onChange={(e) => setAutoConfirmCount(parseInt(e.target.value, 10))}
                        className="w-16 rounded border bg-background px-2 py-1 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between border-t border-amber-200 pt-3 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      disabled={confirmLoading}
                    >
                      <Edit className="mr-1 h-4 w-4" />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSkip}
                      disabled={confirmLoading}
                    >
                      <SkipForward className="mr-1 h-4 w-4" />
                      Skip
                    </Button>
                  </div>

                  <div>
                    {showAutoConfirm ? (
                      <Button
                        onClick={handleAuto}
                        disabled={confirmLoading}
                        size="sm"
                        className="bg-amber-600 text-white hover:bg-amber-700"
                      >
                        {confirmLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Auto-confirm ({autoConfirmCount})
                      </Button>
                    ) : (
                      <Button
                        onClick={isEditing ? handleEdit : handleConfirm}
                        disabled={confirmLoading}
                        size="sm"
                        className="bg-amber-600 text-white hover:bg-amber-700"
                      >
                        {confirmLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Play className="mr-1 h-4 w-4" />
                        {isEditing ? 'Save & Execute' : 'Execute'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
