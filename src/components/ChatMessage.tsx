import { Bot, User, Terminal } from "lucide-react";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { useEffect, useState } from "react";
import type { FC } from "react";
import hljs from "highlight.js";
import type { Message } from "@/types/conversation";

interface Props {
  message: Message;
  isInitialSystem?: boolean;
}

marked.setOptions({
  gfm: true,
  breaks: true,
  silent: true,
});

marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      lang = info.split(".").pop() || lang;
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

interface ProcessedContent {
    processedContent: string;
    fences: string[];
}

export function processNestedCodeBlocks(content: string): ProcessedContent {
    // Early exit if no code blocks
    if (content.split('```').length < 3) {
        return { processedContent: content, fences: [] };
    }

    const lines = content.split('\n');
    const stack: string[] = [];  // Stack of language tags to track nesting
    let result = '';
    let currentBlock: string[] = [];
    const fences: string[] = [];  // Store all fence info for later use

    for (const line of lines) {
        const strippedLine = line.trim();
        if (strippedLine.startsWith('```')) {
            const lang = strippedLine.slice(3);
            if (stack.length === 0) {
                // Only transform outermost blocks that have nested blocks
                const remainingContent = lines.slice(lines.indexOf(line) + 1).join('\n');
                if (remainingContent.includes('```') && remainingContent.split('```').length > 2) {
                    stack.push(lang);
                    fences.push(lang);  // Store fence info
                    result += '~~~' + lang + '\n';
                } else {
                    result += line + '\n';
                }
            } else if (lang && stack[stack.length - 1] !== lang) {
                // Nested start - different language
                currentBlock.push(line);
                stack.push(lang);
            } else {
                // End of a block
                if (stack.length === 1) {
                    // End of outermost block
                    result += currentBlock.join('\n') + '\n~~~';
                    currentBlock = [];
                } else {
                    // End of nested block
                    currentBlock.push(line);
                }
                stack.pop();
            }
        } else if (stack.length > 0) {
            // Inside a block
            currentBlock.push(line);
        } else {
            // Outside any block
            result += line + '\n';
        }
    }

    return {
        processedContent: result.trim(),
        fences
    };
}

export function transformThinkingTags(content: string) {
    // Don't transform if inside backticks
    if (content.startsWith('`') && content.endsWith('`')) {
        return content;
    }

    return content.replace(
        /<thinking>([\s\S]*?)<\/thinking>/g,
        (_match: string, thinkingContent: string) =>
            `<details><summary>💭 Thinking</summary>\n\n${thinkingContent}\n\n</details>`
    );
}

export const ChatMessage: FC<Props> = ({ message }) => {
  const [parsedContent, setParsedContent] = useState("");

  const content = message.content || (message.role == "assistant" ? "Thinking..." : "");

  useEffect(() => {
    let isMounted = true;
    const processContent = async () => {
      try {
        // Transform thinking tags before markdown parsing
        const processedContent = transformThinkingTags(content);

        // Handle wrapped fenced code blocks
        // Process nested code blocks and collect fence info
        const { processedContent: transformedContent, fences } = processNestedCodeBlocks(processedContent);

        let parsedResult = await marked.parse(transformedContent, {
          async: true,
        });

        // TODO: correctly parse file extensions for highlighting, e.g. "```save script.py" will not highlight as python
        parsedResult = parsedResult.replace(
          /<pre><code(?:\s+class="([^"]+)")?>([^]*?)<\/code><\/pre>/g,
          (_, classes = "", code) => {
            const langtag = ((classes || "").split(" ")[1] || "Code").replace(
              "language-",
              ""
            );
            const args = fences?.shift() || "";
            function isPath(langtag: string) {
              return (langtag.includes("/") || langtag.includes("\\") || langtag.includes(".")) && langtag.split(" ").length === 1;
            }
            function isTool(langtag: string) {
              const tools = ["ipython", "shell"];
              return tools.indexOf(langtag.split(" ")[0]) !== -1;
            }
            function isOutput(langtag: string) {
              const outputs = ["stdout", "stderr", "result"];
              return outputs.indexOf(langtag.toLowerCase()) !== -1;
            }
            function isWrite(langtag: string) {
                const writes = ["save", "patch", "append"];
                return writes.indexOf(langtag.toLowerCase()) !== -1;
            }
            const emoji = isPath(langtag) ? "📄" : isTool(langtag) ? "🛠️" : isOutput(langtag) ? "📤" : isWrite(langtag) ? "📝" : "💻";
            return `
            <details>
              <summary>${emoji} ${args || langtag}</summary>
              <pre><code class="${classes}">${code}</code></pre>
            </details>
          `;
          }
        );

        if (isMounted) {
          setParsedContent(parsedResult);
        }
      } catch (error) {
        console.error("Error parsing markdown:", error);
        if (isMounted) {
          setParsedContent(content);
        }
      }
    };

    processContent();

    return () => {
      isMounted = false;
    };
  }, [content]);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isSystem = message.role === "system";
  const isError = message.content.startsWith("Error");
  const isSuccess = message.content.startsWith("Patch successfully");

  const avatarClasses = `hidden md:flex mt-0.5 flex-shrink-0 w-8 h-8 rounded-full items-center justify-center absolute ${
      isUser
      ? "bg-blue-600 text-white right-0"
      : isAssistant
          ? "bg-gptme-600 text-white left-0"
          : (isError
            ? "bg-red-800 text-red-100"
            : (isSuccess
                ? "bg-green-800 text-green-100"
                : "bg-slate-500 text-white left-0")
            )
  }`;

  const messageClasses = `rounded-lg px-3 py-1.5 ${
    isUser
      ? "bg-[#EAF4FF] text-black dark:bg-[#2A3441] dark:text-white"
      : isAssistant
          ? "bg-card"
          : isError
              ? "bg-[#FFDDDD] dark:bg-[#440000] text-red-500"
              : (isSuccess
                  ? "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200"
                  : "bg-card")
  }`;

  return (
    <div className="py-4">
      <div className="max-w-3xl mx-auto px-4">
        <div className="relative">
          <div className={avatarClasses}>
            {isAssistant ? (
              <Bot className="w-5 h-5" />
            ) : isSystem ? (
              <Terminal className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
            <div className="md:px-12">
            <div className={messageClasses}>
              <div
                className="chat-message prose prose-sm dark:prose-invert prose-pre:overflow-x-auto prose-pre:max-w-[calc(100vw-16rem)]"
                dangerouslySetInnerHTML={{ __html: parsedContent }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
