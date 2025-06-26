import { type FC, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Volume2, Palette } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from 'next-themes';

interface SettingsModalProps {
  children?: React.ReactNode;
}

export const SettingsModal: FC<SettingsModalProps> = ({ children }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>Customize your gptme experience</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <Label className="text-sm font-medium">Appearance</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-select" className="text-sm text-muted-foreground">
                Theme
              </Label>
              <Select
                value={theme}
                onValueChange={(value: 'light' | 'dark' | 'system') => setTheme(value)}
              >
                <SelectTrigger id="theme-select">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Audio Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <Label className="text-sm font-medium">Audio</Label>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="chime-toggle" className="text-sm">
                  Completion chime
                </Label>
                <p className="text-xs text-muted-foreground">
                  Play sound when agent completes tasks
                </p>
              </div>
              <Switch
                id="chime-toggle"
                checked={settings.chimeEnabled}
                onCheckedChange={(checked) => updateSettings({ chimeEnabled: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Reset Settings */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Reset settings</Label>
              <p className="text-xs text-muted-foreground">Restore all settings to defaults</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetSettings();
                setTheme('system');
                setOpen(false);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
