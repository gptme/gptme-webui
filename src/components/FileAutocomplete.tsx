import { FC, useEffect, useRef } from 'react';
import { File, Folder } from 'lucide-react';
import type { FileType } from '@/types/workspace';
import { cn } from '@/lib/utils';

interface FileAutocompleteProps {
  files: FileType[];
  selectedIndex: number;
  onSelect: (file: FileType) => void;
  onHover: (index: number) => void;
  isOpen: boolean;
  query: string;
}

export const FileAutocomplete: FC<FileAutocompleteProps> = ({
  files,
  selectedIndex,
  onSelect,
  onHover,
  isOpen,
  query,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  if (!isOpen || files.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 mb-1 w-full max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-lg z-50"
    >
      <div className="p-1">
        {query && (
          <div className="px-2 py-1 text-xs text-muted-foreground border-b mb-1">
            Files matching &quot;{query}&quot;
          </div>
        )}
        {files.map((file, index) => (
          <div
            key={file.path}
            ref={index === selectedIndex ? selectedRef : null}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm',
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted'
            )}
            onClick={() => onSelect(file)}
            onMouseEnter={() => onHover(index)}
          >
            {file.type === 'directory' ? (
              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="truncate flex-1">{file.path}</span>
            {file.type === 'directory' && (
              <span className="text-xs text-muted-foreground">dir</span>
            )}
          </div>
        ))}
        {files.length === 10 && (
          <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1">
            Type more to narrow results...
          </div>
        )}
      </div>
    </div>
  );
};
