import { useEffect, useState } from "react";
import type { FC } from "react";
import type { Message } from "@/types/conversation";
import { MessageAvatar } from "./MessageAvatar";
import { parseMarkdownContent } from "@/utils/markdownUtils";
import { getMessageChainType } from "@/utils/messageUtils";

interface Props {
    message: Message;
    previousMessage?: Message | null;
    nextMessage?: Message | null;
}

export const ChatMessage: FC<Props> = ({ message, previousMessage, nextMessage }) => {
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
    const isError = message.content.startsWith("Error");
    const isSuccess = message.content.startsWith("Patch successfully");
    
    const chainType = getMessageChainType(message, previousMessage, nextMessage);
    
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
        ${chainType === "standalone" && "rounded-lg"}
        ${chainType === "start" && "rounded-t-lg"}
        ${chainType === "end" && "rounded-b-lg"}
        ${chainType === "middle" && ""}
        ${chainType !== "start" && chainType !== "standalone" && "border-t-0"}
    `;

    const wrapperClasses = `
        ${chainType !== "start" && chainType !== "standalone" ? "-mt-[2px]" : "mt-4"}
        ${chainType === "standalone" ? "mb-4" : "mb-0"}
    `;

    return (
        <div className={wrapperClasses}>
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