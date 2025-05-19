import { FileIcon, FolderIcon, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileType } from '@/types/workspace';

interface FileListProps {
  files: FileType[];
  currentPath: string;
  onFileClick: (file: FileType) => void;
  onDirectoryClick: (path: string) => void;
}

export function FileList({ files, currentPath, onFileClick, onDirectoryClick }: FileListProps) {
  const goToParent = () => {
    if (!currentPath) return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    onDirectoryClick(parentPath);
  };

  return (
    <ScrollArea className="h-full px-2">
      <div className="space-y-1 py-2">
        {currentPath && (
          <button
            onClick={goToParent}
            className="flex w-full items-center justify-between rounded-md p-2 hover:bg-muted"
          >
            <div className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span>..</span>
            </div>
          </button>
        )}
        {files.map((file) => (
          <button
            key={file.path}
            onClick={() =>
              file.type === 'directory' ? onDirectoryClick(file.path) : onFileClick(file)
            }
            className="flex w-full items-center justify-between rounded-md p-2 hover:bg-muted"
          >
            <div className="flex items-center">
              {file.type === 'directory' ? (
                <FolderIcon className="mr-2 h-4 w-4" />
              ) : (
                <FileIcon className="mr-2 h-4 w-4" />
              )}
              <span className="text-sm">{file.name}</span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(file.modified), { addSuffix: true })}</span>
              {file.type === 'file' && <span>{(file.size / 1024).toFixed(1)} KB</span>}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
