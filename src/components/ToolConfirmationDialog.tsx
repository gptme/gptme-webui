import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { PendingTool } from '@/hooks/useConversation';
import { Loader2 } from 'lucide-react';

interface ToolConfirmationDialogProps {
  pendingTool: PendingTool | null;
  onConfirm: () => Promise<void>;
  onEdit: (content: string) => Promise<void>;
  onSkip: () => Promise<void>;
  onAuto: (count: number) => Promise<void>;
}

export function ToolConfirmationDialog({
  pendingTool,
  onConfirm,
  onEdit,
  onSkip,
  onAuto,
}: ToolConfirmationDialogProps) {
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [autoConfirmCount, setAutoConfirmCount] = useState(5);
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Reset state when the pending tool changes
  React.useEffect(() => {
    if (pendingTool) {
      // Extract the actual code from ToolUse string if possible
      const content = pendingTool.tooluse.content;
      setEditedContent(content);
      setIsEditing(false);
      setConfirmLoading(false);
    }
  }, [pendingTool]);

  const handleConfirm = async () => {
    setConfirmLoading(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error confirming tool:', error);
    } finally {
      setConfirmLoading(false);
    }
  };

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
    return args.map((arg, i) => `${i + 1}. ${arg}`).join('\n');
  };

  if (!pendingTool) return null;

  return (
    <Dialog open={!!pendingTool} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Tool Execution Confirmation</DialogTitle>
          <DialogDescription>
            The assistant wants to execute a tool. Review the details and choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-medium">Tool:</div>
            <div className="col-span-3 rounded bg-muted p-2 font-mono">
              {pendingTool.tooluse.tool}
            </div>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <div className="font-medium">Arguments:</div>
            <div className="col-span-3 whitespace-pre-wrap rounded bg-muted p-2 font-mono">
              {formatArgs(pendingTool.tooluse.args)}
            </div>
          </div>

          {isEditing ? (
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="font-medium">Edit Code:</div>
              <div className="col-span-3">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={5}
                  className="font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="font-medium">Code:</div>
              <div className="col-span-3 whitespace-pre-wrap rounded bg-muted p-2 font-mono">
                {pendingTool.tooluse.content}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-confirm"
              checked={showAutoConfirm}
              onCheckedChange={(checked) => setShowAutoConfirm(checked as boolean)}
            />
            <label
              htmlFor="auto-confirm"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Auto-confirm future tools
            </label>
          </div>

          {showAutoConfirm && (
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="font-medium">Number of auto-confirmations:</div>
              <div className="col-span-3">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={autoConfirmCount}
                  onChange={(e) => setAutoConfirmCount(parseInt(e.target.value, 10))}
                  className="w-20 rounded border px-2 py-1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between">
          <div>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="mr-2">
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </Button>
            <Button variant="destructive" onClick={handleSkip} disabled={confirmLoading}>
              Skip
            </Button>
          </div>
          <div>
            {showAutoConfirm ? (
              <Button onClick={handleAuto} disabled={confirmLoading}>
                {confirmLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Auto-confirm ({autoConfirmCount})
              </Button>
            ) : (
              <Button onClick={isEditing ? handleEdit : handleConfirm} disabled={confirmLoading}>
                {confirmLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save & Execute' : 'Execute'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
