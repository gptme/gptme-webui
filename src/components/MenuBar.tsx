import { ThemeToggle } from './ThemeToggle';
import { ConnectionButton } from './ConnectionButton';
import { Button } from './ui/button';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import {
  leftSidebarVisible$,
  rightSidebarVisible$,
  toggleLeftSidebar,
  toggleRightSidebar,
} from '@/stores/sidebar';
import { use$ } from '@legendapp/state/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { FC } from 'react';

export const MenuBar: FC = () => {
  const leftVisible = use$(leftSidebarVisible$);
  const rightVisible = use$(rightSidebarVisible$);

  return (
    <div className="flex h-9 items-center justify-between border-b px-4">
      <div className="flex items-center space-x-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2" onClick={toggleLeftSidebar}>
                {leftVisible ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {leftVisible ? 'Hide conversations' : 'Show conversations'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <img src="https://gptme.org/media/logo.png" alt="gptme logo" className="w-4" />
        <span className="font-mono text-base font-semibold">gptme</span>
      </div>
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleRightSidebar}>
                {rightVisible ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {rightVisible ? 'Hide sidebar' : 'Show sidebar'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <ConnectionButton />
        <ThemeToggle />
      </div>
    </div>
  );
};
