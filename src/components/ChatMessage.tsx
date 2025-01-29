import { useEffect, useState } from "react";
import type { FC } from "react";
import type { Message } from "@/types/conversation";
import { MessageAvatar } from "./MessageAvatar";
import { parseMarkdownContent } from "@/utils/markdownUtils";

interface Props {
    message: Message;
    previousMessage?: Message | null;
}

export const ChatMessage: FC<Props> = ({ message, previousMessage }) => {
    const [parsedContent, setParsedContent] = useState("");
    const content = message.content || (message.role === "assistant" ? "Thinking..." : "");

    useEffect(() => {
        let isMounted = true;
        const processContent = async () => {
            try {
                const result = parseMarkdownContent(content);
                if (isMounted) {
                    setParsedContent(result);
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
    const isToolResponse = isSystem && previousMessage && 
        (previousMessage.role === "user" || previousMessage.role === "assistant");

    const messageClasses = `
        ${isUser
            ? "bg-[#EAF4FF] text-black dark:bg-[#2A3441] dark:text-white"
            : isAssistant
                ? "bg-card"
                : isError
                    ? "bg-[#FFDDDD] dark:bg-[#440000] text-red-500"
                    : isSuccess
                        ? "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200"
                        : "bg-card"
        }
        ${!isToolResponse && 'rounded-lg'}
        ${isToolResponse && previousMessage?.role === 'user' && 'rounded-b-lg'}
        ${isToolResponse && previousMessage?.role === 'assistant' && 'rounded-b-lg'}
    `;

    return (
        <div className={`${isToolResponse ? '-mt-4 border-t-0' : 'py-4'}`}>
            <div className="max-w-3xl mx-auto px-4">
                <div className="relative">
                    <MessageAvatar 
                        role={message.role}
                        isError={isError}
                        isSuccess={isSuccess}
                    />
                    <div className="md:px-12">
                        <div className={messageClasses}>
                            <div
                                className="chat-message prose prose-sm dark:prose-invert prose-pre:overflow-x-auto prose-pre:max-w-[calc(100vw-16rem)] px-3 py-1.5"
                                dangerouslySetInnerHTML={{ __html: parsedContent }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};