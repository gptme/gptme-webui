
import { ThemeToggle } from "./ThemeToggle";
import { useNavigate } from "react-router-dom";
import type { FC } from "react";

export const MenuBar: FC = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/new', { replace: true }); // Navigate to the welcome page
  };

  return (
    <div className="h-9 border-b flex items-center justify-between px-4">
      <div 
        className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleLogoClick}
      >
        <img
          src="https://gptme.org/media/logo.png"
          alt="gptme logo"
          className="w-4"
        />
        <span className="font-semibold text-base font-mono">gptme</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </div>
  );
};
