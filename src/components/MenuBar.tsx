import { ThemeToggle } from './ThemeToggle';
import { ConnectionButton } from './ConnectionButton';
import { SettingsModal } from './SettingsModal';
import { Button } from './ui/button';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Kanban,
  Menu,
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
      path: '/chat',
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

interface MenuBarProps {
  showRightSidebar?: boolean;
}

export const MenuBar: FC<MenuBarProps> = ({ showRightSidebar = false }) => {
  const leftVisible = use$(leftSidebarVisible$);
  const rightVisible = use$(rightSidebarVisible$);
  const location = useLocation();
  const isTasksView = location.pathname.startsWith('/tasks');

  return (
    <div className="flex h-9 items-center justify-between border-b px-2 sm:px-4">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-1 sm:-ml-2"
                  onClick={toggleLeftSidebar}
                  data-testid="toggle-conversations-sidebar"
                >
                  {/* Show hamburger menu on mobile, panel icons on desktop */}
                  <span className="block sm:hidden">
                    <Menu className="h-4 w-4" />
                  </span>
                  <span className="hidden sm:block">
                    {leftVisible ? (
                      <PanelLeftClose className="h-4 w-4" />
                    ) : (
                      <PanelLeftOpen className="h-4 w-4" />
                    )}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isTasksView
                  ? leftVisible
                    ? 'Hide tasks'
                    : 'Show tasks'
                  : leftVisible
                    ? 'Hide conversations'
                    : 'Show conversations'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link
            to="/chat"
            className="flex items-center space-x-1 transition-opacity hover:opacity-80 sm:space-x-2"
          >
            <img src="https://gptme.org/media/logo.png" alt="gptme logo" className="w-4" />
            <span className="font-mono text-sm font-semibold sm:text-base">gptme</span>
          </Link>
        </div>

        <div className="hidden sm:block">
          <NavigationTabs />
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-4">
        {/* Show on mobile for tasks view only */}
        <div className="block sm:hidden">
          <NavigationTabs />
        </div>

        <div className="hidden sm:flex sm:items-center sm:gap-4">
          <ConnectionButton />
          <ThemeToggle />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SettingsModal />
              </TooltipTrigger>
              <TooltipContent side="bottom">Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Mobile menu for settings etc */}
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
        </div>

        {showRightSidebar && (
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
        )}
      </div>
    </div>
  );
};
