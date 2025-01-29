import { Bot, User, Terminal } from "lucide-react";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { useEffect, useState } from "react";
import type { FC } from "react";
import hljs from "highlight.js";
import type { Message } from "@/types/conversation";

interface Props {
  message: Message;
  previousMessage?: Message;
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

function handleWrappedFencedCodeBlocks(content: string) {
    // Parse codeblocks in string, handling nested blocks by changing the outermost level
    // fence to use ~~~ instead of backticks (need to count backticks to make sure it's the outermost).
    //
    // We can assume that codeblocks always have a language tag, so we can use that to separate the start and end of the block.
    //
    // Example input:
    // ```markdown
    // Here's a nested block
    // ```python
    // print("hello")
    // ```
    // ```
    //
    // Example output:
    // ~~~markdown
    // Here's a nested block
    // ```python
    // print("hello")
    // ```
    // ~~~

    // Early exit if no code blocks (needs at least opening and closing fence)
    if (content.split('```').length < 3) {
        return content;
    }

    const lines = content.split('\n');
    const stack: string[] = [];  // Stack of language tags to track nesting
    let result = '';
    let currentBlock: string[] = [];

    for (const line of lines) {
        const strippedLine = line.trim();
        if (strippedLine.startsWith('```')) {
            const lang = strippedLine.slice(3);
            if (stack.length === 0) {
                // Start of a new outermost block
                stack.push(lang);
                result += '~~~' + lang + '\n';
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

    // Handle any unclosed blocks
    if (stack.length > 0) {
        result += currentBlock.join('\n');
    }

    return result.trim();
}

export const ChatMessage: FC<Props> = ({ message, previousMessage }) => {
  const [parsedContent, setParsedContent] = useState("");

  const content = message.content || (message.role == "assistant" ? "Thinking..." : "");

  useEffect(() => {
    let isMounted = true;
    const processContent = async () => {
      try {
        // Transform thinking tags before markdown parsing
        let processedContent = content.replace(
          /(?:[^`])<thinking>([\s\S]*?)(?:<\/thinking>|$)/g,
          (_match: string, thinkingContent: string) =>
            `<details><summary>Thinking</summary>\n\n${thinkingContent}\n\n</details>`
        );

        // Handle wrapped fenced code blocks
        processedContent = handleWrappedFencedCodeBlocks(processedContent);

        let parsedResult = await marked.parse(processedContent, {
          async: true,
        });

        parsedResult = parsedResult.replace(
          /<pre><code(?:\s+class="([^"]+)")?>([^]*?)<\/code><\/pre>/g,
          (_, classes = "", code) => {
            const langtag = ((classes || "").split(" ")[1] || "Code").replace(
              "language-",
              ""
            );
            return `
            <details>
              <summary>${langtag}</summary>
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

  // Check if this system message follows a user/assistant message
  const isToolResponse = isSystem && previousMessage && (previousMessage.role === "user" || previousMessage.role === "assistant");

  const avatarClasses = `hidden md:flex mt-0.5 flex-shrink-0 w-8 h-8 rounded-full items-center justify-center absolute ${
    isAssistant
      ? "bg-gptme-600 text-white left-0"
      : isSystem
          ? (isError ? "bg-red-800 text-red-100" : (isSuccess ? "bg-green-800 text-green-100" : "bg-slate-500 text-white left-0"))
      : "bg-blue-600 text-white right-0"
  }`;

  const messageClasses = `rounded-lg px-3 py-1.5 ${
    isAssistant
      ? "bg-card"
      : isUser
          ? "bg-[#EAF4FF] text-black dark:bg-[#2A3441] dark:text-white"
          : (isError ? "bg-[#FFDDDD] dark:bg-[#440000] text-red-500" : (isSuccess ? "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200" : "bg-muted"))
  }`;

  return (
    <div className={`${isToolResponse ? 'pt-0 pb-4' : 'py-4'}`}>
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
