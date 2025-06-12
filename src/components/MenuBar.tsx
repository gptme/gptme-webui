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
import { Link } from 'react-router-dom';

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
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2"
                onClick={toggleLeftSidebar}
                data-testid="toggle-conversations-sidebar"
              >
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
        <Link to="/" className="flex items-center space-x-2 transition-opacity hover:opacity-80">
          <img src="https://gptme.org/media/logo.png" alt="gptme logo" className="w-4" />
          <span className="font-mono text-base font-semibold">gptme</span>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <ConnectionButton />
        <ThemeToggle />
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
      </div>
    </div>
  );
};
