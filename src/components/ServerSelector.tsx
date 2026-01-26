/**
 * Server selector dropdown for multi-backend support (Phase 1)
 *
 * Displays current server and allows switching between configured servers.
 * Integrates with ConnectionButton and triggers reconnection on server change.
 */

import { useState, type FC } from 'react';
import { Check, ChevronDown, Plus, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { use$ } from '@legendapp/state/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  serverRegistry$,
  getActiveServer,
  setActiveServer,
  addServer,
  removeServer,
  serverUrlExists,
} from '@/stores/servers';
import { useApi } from '@/contexts/ApiContext';
import type { ServerConfig } from '@/types/servers';

interface AddServerFormState {
  name: string;
  baseUrl: string;
  authToken: string;
  useAuthToken: boolean;
}

const initialFormState: AddServerFormState = {
  name: '',
  baseUrl: 'http://127.0.0.1:5700',
  authToken: '',
  useAuthToken: false,
};

export const ServerSelector: FC = () => {
  const { connect, isConnected$, isConnecting$ } = useApi();
  const registry = use$(serverRegistry$);
  const isConnected = use$(isConnected$);
  const isConnecting = use$(isConnecting$);
  const activeServer = getActiveServer();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formState, setFormState] = useState<AddServerFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleServerChange = async (server: ServerConfig) => {
    if (server.id === registry.activeServerId) return;

    // Update active server
    setActiveServer(server.id);

    // Reconnect to the new server
    try {
      await connect({
        baseUrl: server.baseUrl,
        authToken: server.useAuthToken ? server.authToken : null,
        useAuthToken: server.useAuthToken,
      });
      toast.success(`Switched to ${server.name}`);
    } catch (error) {
      console.error('Failed to connect to server:', error);
      // Error toast is shown by the connect function
    }
  };

  const handleAddServer = async () => {
    // Validate form
    if (!formState.name.trim()) {
      toast.error('Please enter a server name');
      return;
    }
    if (!formState.baseUrl.trim()) {
      toast.error('Please enter a server URL');
      return;
    }

    // Check for duplicate URL
    if (serverUrlExists(formState.baseUrl)) {
      toast.error('A server with this URL already exists');
      return;
    }

    setIsSubmitting(true);

    // Save previous active server for rollback on error
    const previousActiveServerId = registry.activeServerId;
    let newServer: ReturnType<typeof addServer> | null = null;

    try {
      // Add the server
      newServer = addServer({
        name: formState.name.trim(),
        baseUrl: formState.baseUrl.trim(),
        authToken: formState.useAuthToken ? formState.authToken : null,
        useAuthToken: formState.useAuthToken,
      });

      // Switch to the new server and connect
      setActiveServer(newServer.id);
      await connect({
        baseUrl: newServer.baseUrl,
        authToken: newServer.useAuthToken ? newServer.authToken : null,
        useAuthToken: newServer.useAuthToken,
      });

      toast.success(`Added and connected to ${newServer.name}`);
      setAddDialogOpen(false);
      setFormState(initialFormState);
    } catch (error) {
      console.error('Failed to add server:', error);
      toast.error('Failed to connect to the new server');

      // Roll back: remove the newly added server and restore previous active
      if (newServer) {
        removeServer(newServer.id);
      }
      if (previousActiveServerId) {
        setActiveServer(previousActiveServerId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getServerDisplayName = (server: ServerConfig | null) => {
    if (!server) return 'No Server';
    // Truncate long names
    return server.name.length > 20 ? server.name.substring(0, 17) + '...' : server.name;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="xs"
            className={cn(
              'flex items-center gap-1 text-muted-foreground',
              isConnected && 'text-foreground'
            )}
            disabled={isConnecting}
          >
            <Server className="h-3 w-3" />
            <span className="max-w-[120px] truncate text-xs">
              {getServerDisplayName(activeServer)}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {registry.servers.map((server) => (
            <DropdownMenuItem
              key={server.id}
              onClick={() => handleServerChange(server)}
              className="flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="font-medium">{server.name}</span>
                <span className="text-xs text-muted-foreground">{server.baseUrl}</span>
              </div>
              {server.id === registry.activeServerId && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Server
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Server Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Server</DialogTitle>
            <DialogDescription>Add a new gptme server to your configuration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-name">Server Name</Label>
              <Input
                id="server-name"
                placeholder="My Server"
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="server-url">Server URL</Label>
              <Input
                id="server-url"
                placeholder="http://127.0.0.1:5700"
                value={formState.baseUrl}
                onChange={(e) => setFormState((prev) => ({ ...prev, baseUrl: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-auth"
                checked={formState.useAuthToken}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, useAuthToken: checked === true }))
                }
              />
              <Label htmlFor="use-auth" className="cursor-pointer text-sm">
                Requires authentication
              </Label>
            </div>
            {formState.useAuthToken && (
              <div className="space-y-2">
                <Label htmlFor="auth-token">Auth Token</Label>
                <Input
                  id="auth-token"
                  type="password"
                  placeholder="Your authentication token"
                  value={formState.authToken}
                  onChange={(e) => setFormState((prev) => ({ ...prev, authToken: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddServer} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add & Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
