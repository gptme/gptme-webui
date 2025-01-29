import { ThemeToggle } from "./ThemeToggle";
import { ConnectionButton } from "./ConnectionButton";

import type { FC } from "react";

export const MenuBar: FC = () => {
  return (
    <div className="h-9 border-b flex items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        <img
          src="https://gptme.org/media/logo.png"
          alt="gptme logo"
          className="w-4"
        />
        <span className="font-semibold text-base font-mono">gptme</span>
      </div>
      <div className="flex items-center gap-2">
        <ConnectionButton />
        <ThemeToggle />
      </div>
    </div>
  );
};
