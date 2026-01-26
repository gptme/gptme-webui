/**
 * Server configuration settings for multi-backend support (Phase 1)
 *
 * Allows users to manage their server list: add, edit, delete, and set default.
 */

import { useState, type FC } from 'react';
import { Edit2, Plus, Server, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { use$ } from '@legendapp/state/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  serverRegistry$,
  addServer,
  updateServer,
  removeServer,
  setActiveServer,
  serverUrlExists,
} from '@/stores/servers';
import { useApi } from '@/contexts/ApiContext';
import type { ServerConfig } from '@/types/servers';

interface ServerFormState {
  name: string;
  baseUrl: string;
  authToken: string;
  useAuthToken: boolean;
}

const emptyFormState: ServerFormState = {
  name: '',
  baseUrl: 'http://127.0.0.1:5700',
  authToken: '',
  useAuthToken: false,
};

export const ServerConfiguration: FC = () => {
  const { connect } = useApi();
  const registry = use$(serverRegistry$);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [formState, setFormState] = useState<ServerFormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddDialog = () => {
    setEditingServer(null);
    setFormState(emptyFormState);
    setEditDialogOpen(true);
  };

  const openEditDialog = (server: ServerConfig) => {
    setEditingServer(server);
    setFormState({
      name: server.name,
      baseUrl: server.baseUrl,
      authToken: server.authToken || '',
      useAuthToken: server.useAuthToken,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (server: ServerConfig) => {
    setEditingServer(server);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    // Validate
    if (!formState.name.trim()) {
      toast.error('Please enter a server name');
      return;
    }
    if (!formState.baseUrl.trim()) {
      toast.error('Please enter a server URL');
      return;
    }

    // Check for duplicate URL (excluding current server if editing)
    if (serverUrlExists(formState.baseUrl, editingServer?.id)) {
      toast.error('A server with this URL already exists');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingServer) {
        // Update existing server
        updateServer(editingServer.id, {
          name: formState.name.trim(),
          baseUrl: formState.baseUrl.trim(),
          authToken: formState.useAuthToken ? formState.authToken : null,
          useAuthToken: formState.useAuthToken,
        });

        // If this is the active server, reconnect with new config
        if (editingServer.id === registry.activeServerId) {
          await connect({
            baseUrl: formState.baseUrl.trim(),
            authToken: formState.useAuthToken ? formState.authToken : null,
            useAuthToken: formState.useAuthToken,
          });
        }

        toast.success(`Updated ${formState.name}`);
      } else {
        // Add new server
        addServer({
          name: formState.name.trim(),
          baseUrl: formState.baseUrl.trim(),
          authToken: formState.useAuthToken ? formState.authToken : null,
          useAuthToken: formState.useAuthToken,
        });
        toast.success(`Added ${formState.name}`);
      }

      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to save server:', error);
      toast.error('Failed to save server configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!editingServer) return;

    if (registry.servers.length <= 1) {
      toast.error('Cannot delete the last server');
      setDeleteDialogOpen(false);
      return;
    }

    removeServer(editingServer.id);
    toast.success(`Deleted ${editingServer.name}`);
    setDeleteDialogOpen(false);
    setEditingServer(null);
  };

  const handleSetActive = async (server: ServerConfig) => {
    if (server.id === registry.activeServerId) return;

    setActiveServer(server.id);
    try {
      await connect({
        baseUrl: server.baseUrl,
        authToken: server.useAuthToken ? server.authToken : null,
        useAuthToken: server.useAuthToken,
      });
      toast.success(`Switched to ${server.name}`);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-lg font-medium">Servers</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Manage your gptme server connections. Click a server to set it as active.
        </p>
      </div>

      {/* Server List */}
      <div className="space-y-2">
        {registry.servers.map((server) => {
          const isActive = server.id === registry.activeServerId;
          return (
            <div
              key={server.id}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3 transition-colors',
                isActive
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'cursor-pointer border-border hover:bg-muted/50'
              )}
              onClick={() => !isActive && handleSetActive(server)}
            >
              <div className="flex items-center gap-3">
                <Server
                  className={cn('h-5 w-5', isActive ? 'text-green-500' : 'text-muted-foreground')}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{server.name}</span>
                    {isActive && (
                      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{server.baseUrl}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(server);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteDialog(server);
                  }}
                  disabled={registry.servers.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Server Button */}
      <Button variant="outline" onClick={openAddDialog} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Server
      </Button>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingServer ? 'Edit Server' : 'Add Server'}</DialogTitle>
            <DialogDescription>
              {editingServer
                ? 'Update server configuration.'
                : 'Add a new gptme server to your configuration.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-server-name">Server Name</Label>
              <Input
                id="edit-server-name"
                placeholder="My Server"
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-server-url">Server URL</Label>
              <Input
                id="edit-server-url"
                placeholder="http://127.0.0.1:5700"
                value={formState.baseUrl}
                onChange={(e) => setFormState((prev) => ({ ...prev, baseUrl: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-use-auth"
                checked={formState.useAuthToken}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, useAuthToken: checked === true }))
                }
              />
              <Label htmlFor="edit-use-auth" className="cursor-pointer text-sm">
                Requires authentication
              </Label>
            </div>
            {formState.useAuthToken && (
              <div className="space-y-2">
                <Label htmlFor="edit-auth-token">Auth Token</Label>
                <Input
                  id="edit-auth-token"
                  type="password"
                  placeholder="Your authentication token"
                  value={formState.authToken}
                  onChange={(e) => setFormState((prev) => ({ ...prev, authToken: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{editingServer?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
