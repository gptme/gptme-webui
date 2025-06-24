import { ThemeToggle } from './ThemeToggle';
import { ConnectionButton } from './ConnectionButton';
import { Button } from './ui/button';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Kanban,
} from 'lucide-react';
import {
  leftSidebarVisible$,
  rightSidebarVisible$,
  toggleLeftSidebar,
  toggleRightSidebar,
} from '@/stores/sidebar';
import { use$ } from '@legendapp/state/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link, useLocation } from 'react-router-dom';

import type { FC } from 'react';

const NavigationTabs: FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    {
      path: '/',
      label: 'Chat',
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      path: '/tasks',
      label: 'Tasks',
      icon: <Kanban className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex items-center space-x-1 rounded-md bg-muted/50 p-1">
      {tabs.map((tab) => {
        const isActive = currentPath === tab.path;
        return (
          <Link key={tab.path} to={tab.path}>
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              className={`flex items-center gap-1.5 text-sm ${
                isActive ? 'bg-background shadow-sm' : 'hover:bg-background/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
};

export const MenuBar: FC = () => {
  const leftVisible = use$(leftSidebarVisible$);
  const rightVisible = use$(rightSidebarVisible$);

  return (
    <div className="flex h-9 items-center justify-between border-b px-4">
      <div className="flex items-center space-x-4">
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

        <NavigationTabs />
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
