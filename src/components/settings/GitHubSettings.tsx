import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Github, Check, AlertCircle } from 'lucide-react';

// Local storage key for GitHub token (placeholder - should use backend API)
const GITHUB_TOKEN_KEY = 'gptme_github_token';

interface GitHubSettingsProps {
  className?: string;
}

export const GitHubSettings = ({ className }: GitHubSettingsProps) => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Check if token exists in storage
    const storedToken = localStorage.getItem(GITHUB_TOKEN_KEY);
    setHasStoredToken(!!storedToken);
  }, []);

  const handleSave = async () => {
    if (!token.trim()) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // TODO: Replace with API call to gptme-server
      // The server should:
      // 1. Encrypt the token
      // 2. Store in user's profile in Supabase
      // 3. Return success/failure
      //
      // Example future API call:
      // await api.saveGitHubToken(token);

      // Placeholder: Store in localStorage (NOT SECURE - for development only)
      localStorage.setItem(GITHUB_TOKEN_KEY, token);
      setHasStoredToken(true);
      setToken('');
      setSaveStatus('success');

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save GitHub token:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    // TODO: Replace with API call to clear token from backend
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    setHasStoredToken(false);
    setToken('');
    setSaveStatus('idle');
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          <h3 className="text-lg font-medium">GitHub Integration</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Add your GitHub Personal Access Token to enable agents to push changes to your
          repositories. Create a token at{' '}
          <a
            href="https://github.com/settings/tokens/new?description=gptme-agent&scopes=repo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            github.com/settings/tokens
          </a>{' '}
          with the <code className="rounded bg-muted px-1">repo</code> scope.
        </p>

        {hasStoredToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                GitHub token configured
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClear}>
                Remove Token
              </Button>
              <Button variant="outline" size="sm" onClick={() => setHasStoredToken(false)}>
                Update Token
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="github-token">Personal Access Token</Label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Input
                    id="github-token"
                    type={showToken ? 'text' : 'password'}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={isSaving}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button onClick={handleSave} disabled={!token.trim() || isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Token saved successfully
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                Failed to save token. Please try again.
              </div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Note:</strong> Your token is currently stored locally. In production, tokens are
            encrypted and stored securely on our servers.
          </p>
        </div>
      </div>
    </div>
  );
};
