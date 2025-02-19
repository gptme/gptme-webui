
import { type FC } from "react";
import { Bot, Code, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const WelcomeAction: FC<WelcomeActionProps> = ({ icon, title, description, onClick }) => (
  <Button
    variant="outline"
    className="h-auto p-4 flex items-start gap-4 hover:bg-accent"
    onClick={onClick}
  >
    <div className="shrink-0 mt-1">{icon}</div>
    <div className="text-left">
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </Button>
);

interface Props {
  onActionSelect: (message: string) => void;
}

export const WelcomeView: FC<Props> = ({ onActionSelect }) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to gptme</h1>
          <p className="text-lg text-muted-foreground">
            Your AI programming assistant. How can I help you today?
          </p>
        </div>

        <div className="grid gap-4">
          <WelcomeAction
            icon={<Code className="w-5 h-5" />}
            title="Write and modify code"
            description="Let me help you write, refactor, or debug your code. I can work with various programming languages and frameworks."
            onClick={() => onActionSelect("Help me write a Python script that processes JSON files.")}
          />
          <WelcomeAction
            icon={<Bot className="w-5 h-5" />}
            title="Use AI tools and automation"
            description="I can help you with AI tasks, automation, and integrating various tools into your workflow."
            onClick={() => onActionSelect("Show me how to use the available AI tools in gptme.")}
          />
          <WelcomeAction
            icon={<Lightbulb className="w-5 h-5" />}
            title="Get programming guidance"
            description="Ask questions about programming concepts, best practices, or get help with specific technologies."
            onClick={() => onActionSelect("Explain how to structure a React application for scalability.")}
          />
          <WelcomeAction
            icon={<Sparkles className="w-5 h-5" />}
            title="Explore gptme capabilities"
            description="Learn about all the features and tools available in gptme to enhance your development workflow."
            onClick={() => onActionSelect("What tools and capabilities does gptme offer?")}
          />
        </div>
      </div>
    </div>
  );
};
