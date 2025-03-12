import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Network, Check, Copy } from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const ConnectionButton: FC = () => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { baseUrl, setBaseUrl, isConnected, authToken, setAuthToken, tryConnect } = useApi();
  const [url, setUrl] = useState(baseUrl);
  const [useAuthToken, setUseAuthToken] = useState(authToken !== null && authToken !== '');
  const [userToken, setUserToken] = useState(authToken || '');

  // Auto-connect if parameters were provided through URL fragments
  useEffect(() => {
    const autoConnect = async () => {
      // Don't auto-connect if already connected
      if (isConnected) return;

      // Check if URL and token were provided (different from default)
      const defaultBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
      const isUrlFromFragment = url !== defaultBaseUrl;
      const isTokenFromFragment = userToken !== '';

      if (isUrlFromFragment && isTokenFromFragment) {
        try {
          console.log('Auto-connecting with URL fragment parameters', { url, userToken });

          // Update state before connecting
          setBaseUrl(url);
          if (isTokenFromFragment) {
            setAuthToken(userToken);
          }

          await tryConnect();
          toast({
            title: 'Connected',
            description: 'Successfully connected to gptme instance with URL fragment parameters',
          });
        } catch (error) {
          console.error('Auto-connection failed:', error);
          // Don't show toast on auto-connect failure to avoid confusion
        }
      }
    };

    // Only run on initial mount
    void autoConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const features = [
    'Create new conversations',
    'Access conversation history',
    'Generate AI responses',
  ];

  const serverCommand = `gptme-server --cors-origin='${window.location.origin}'`;

  const copyCommand = () => {
    navigator.clipboard.writeText(serverCommand);
    toast({
      title: 'Copied',
      description: 'Command copied to clipboard',
    });
  };

  const onChangeUserToken = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value && e.target.value.startsWith('Bearer ')) {
      setUserToken(e.target.value.replace('Bearer ', ''));
      toast({
        variant: 'default',
        title: 'Formated token',
        description: 'Detected "Bearer" prefix, it is now automatically removed',
      });
      return;
    }
    setUserToken(e.target.value);
  };

  const handleConnect = async () => {
    try {
      setBaseUrl(url);
      if (useAuthToken) {
        setAuthToken(userToken);
      }
      await tryConnect();
      toast({
        title: 'Connected',
        description: 'Successfully connected to gptme instance',
      });
      setOpen(false);
    } catch (error) {
      let errorMessage = 'Could not connect to gptme instance.';
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('CORS')) {
          errorMessage +=
            ' CORS issue detected - ensure the server has CORS enabled and is accepting requests from ' +
            window.location.origin;
        } else {
          errorMessage += ' Error: ' + error.message;
        }
      }

      console.error('Connection error:', error);
      toast({
        variant: 'destructive',
        title: 'Connection failed',
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          className={isConnected ? 'text-green-600' : 'text-muted-foreground'}
        >
          <Network className="mr-2 h-3 w-3" />
          {isConnected ? 'Connected' : 'Connect'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to gptme</DialogTitle>
          <DialogDescription>
            Connect to a gptme instance to enable advanced features and AI interactions. See the{' '}
            <a
              href="https://gptme.org/docs/server.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              server documentation
            </a>{' '}
            for more details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              Server URL
            </label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://127.0.0.1:5000"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-auth"
              checked={useAuthToken}
              onCheckedChange={(checked) => setUseAuthToken(checked === true)}
            />
            <Label htmlFor="use-auth" className="cursor-pointer text-sm font-medium">
              Add Authorization header
            </Label>
          </div>

          {useAuthToken && (
            <div className="space-y-2">
              <label htmlFor="auth-token" className="text-sm font-medium">
                User Token
              </label>
              <Input
                id="auth-token"
                value={userToken}
                onChange={onChangeUserToken}
                placeholder="Your authentication token"
              />
              <p className="text-xs text-muted-foreground">
                Will be sent as: Authorization: Bearer "[user token]"
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Start the server with:</label>
            <div className="flex items-center gap-2 rounded-md bg-muted p-2">
              <code className="flex-1 text-sm">{serverCommand}</code>
              <Button variant="ghost" size="icon" onClick={copyCommand} className="h-8 w-8">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Features enabled by connecting:</h4>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <Check
                    className={cn('mr-2 h-4 w-4', isConnected ? 'text-green-500' : 'text-gray-300')}
                  />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleConnect}
            className={cn('w-full', isConnected && 'bg-green-600 hover:bg-green-700')}
          >
            {isConnected ? 'Reconnect' : 'Connect'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
