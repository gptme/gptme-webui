
import { FC } from "react";
import { Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedProject: string;
  onProjectChange: (value: string) => void;
  selectedWorkspace: string;
  onWorkspaceChange: (value: string) => void;
  selectedDate?: Date;
  onDateChange: (date?: Date) => void;
}

export const ConversationFilters: FC<Props> = ({
  searchTerm,
  onSearchChange,
  selectedProject,
  onProjectChange,
  selectedWorkspace,
  onWorkspaceChange,
  selectedDate,
  onDateChange,
}) => {
  return (
    <div className="px-4 py-2 border-t space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Project"
          value={selectedProject}
          onChange={(e) => onProjectChange(e.target.value)}
          className="h-9"
        />
        <Input
          placeholder="Workspace"
          value={selectedWorkspace}
          onChange={(e) => onWorkspaceChange(e.target.value)}
          className="h-9"
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={onDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
