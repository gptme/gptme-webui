
import { FC } from "react";
import { ExternalLink } from "lucide-react";

export const SidebarFooter: FC = () => {
  return (
    <div className="mt-auto border-t p-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-center space-x-4">
        <a
          href="https://github.com/ErikBjare/gptme"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center hover:text-foreground"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          gptme
        </a>
        <a
          href="https://github.com/ErikBjare/gptme-webui"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center hover:text-foreground"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          gptme-webui
        </a>
      </div>
    </div>
  );
};
