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
    const isSystem = message.role === "system";
    const isError = message.content.startsWith("Error");
    const isSuccess = message.content.startsWith("Patch successfully");

    const chainType = getMessageChainType(message, previousMessage ?? null, nextMessage ?? null);

    const messageClasses = `
        ${isUser
            ? "bg-[#EAF4FF] text-black dark:bg-[#2A3441] dark:text-white"
            : (isAssistant
                ? "bg-[#F8F9FA] dark:bg-card text-foreground"
                : (isSystem
                    ? ("font-mono border " + (isError
                        ? "bg-[#FFF2F2] text-red-600 dark:bg-[#440000] dark:text-red-300 border-red-400 dark:border-red-800"
                        : (isSuccess
                            ? "bg-[#F0FDF4] text-green-700 dark:bg-[#003300] dark:text-green-200 border-green-400 dark:border-green-800"
                            : "bg-[#DDD] text-[#111] dark:bg-[#111] dark:text-gray-100 border-gray-200 dark:border-gray-800")))
                    : "bg-card")
                )
        }
        ${chainType === "standalone" && "rounded-lg" || ''}
        ${chainType === "start" && "rounded-t-lg" || ''}
        ${chainType === "end" && "rounded-b-lg" || ''}
        ${chainType === "middle" && ""}
        ${chainType !== "start" && chainType !== "standalone" && "border-t-0" || ''}
        border
    `;

    const wrapperClasses = `
        ${chainType !== "start" && chainType !== "standalone" ? "-mt-[2px]" : "mt-4"}
        ${chainType === "standalone" ? "mb-4" : "mb-0"}
    `;

    return (
        <div className={`role-${message.role} ${wrapperClasses}`}>
            <div className="max-w-3xl mx-auto px-4">
                <div className="relative">
                    <MessageAvatar
                        role={message.role}
                        isError={isError}
                        isSuccess={isSuccess}
                        chainType={chainType}
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
