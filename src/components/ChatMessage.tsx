import { useEffect, useState } from "react";
import type { FC } from "react";
import type { Message } from "@/types/conversation";
import { MessageAvatar } from "./MessageAvatar";
import { parseMarkdownContent } from "@/utils/markdownUtils";
import { getMessageChainType } from "@/utils/messageUtils";
import { useApi } from "@/contexts/ApiContext";

interface Props {
    message: Message;
    previousMessage?: Message | null;
    nextMessage?: Message | null;
    conversationId: string;
}

export const ChatMessage: FC<Props> = ({ message, previousMessage, nextMessage, conversationId }) => {
    const { baseUrl } = useApi();
    const [parsedContent, setParsedContent] = useState("");
    const content = message.content || (message.role === "assistant" ? "Thinking..." : "");

    const renderFiles = () => {
        if (!message.files?.length) return null;

        return (
            <div className="mt-2 space-y-2">
                {message.files.map((filename) => {
                    // Remove any parent directory references and normalize path
                    const sanitizedPath = filename.split('/').filter(part => part !== '..').join('/');
                    const fileUrl = `${baseUrl}/api/conversations/${conversationId}/files/${sanitizedPath}`;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

                    // Get just the filename without path for display
                    const displayName = sanitizedPath.split('/').pop() || sanitizedPath;

                    if (isImage) {
                        return (
                            <div key={filename} className="max-w-md">
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block cursor-zoom-in"
                                    title="Click to view full size"
                                >
                                    <div className="relative">
                                        <img
                                            src={fileUrl}
                                            alt={displayName}
                                            className="rounded-md border border-border hover:opacity-90 transition-opacity"
                                            onError={(e) => {
                                                const img = e.currentTarget;
                                                const errorDiv = img.parentElement?.querySelector('.error-message');
                                                if (errorDiv) {
                                                    if (img.src.includes('..')) {
                                                        errorDiv.textContent = "⚠️ Cannot access files outside the workspace";
                                                    } else {
                                                        errorDiv.textContent = "⚠️ Failed to load image";
                                                    }
                                                    errorDiv.classList.remove('hidden');
                                                }
                                                img.classList.add('hidden');
                                            }}
                                        />
                                        <div className="error-message hidden p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"></div>
                                    </div>
                                </a>
                                <div className="text-xs text-muted-foreground mt-1">{displayName}</div>
                            </div>
                        );
                    }

                    return (
                        <div key={filename} className="text-sm">
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                            >
                                📎 {displayName}
                            </a>
                        </div>
                    );
                })}
            </div>
        );
    };

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
    const isSuccess = message.content.startsWith("Patch successfully") || message.content.startsWith("Saved");

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
                            <div className="px-3 py-1.5">
                                <div
                                    className="chat-message prose prose-sm dark:prose-invert prose-pre:overflow-x-auto prose-pre:max-w-[calc(100vw-16rem)]"
                                    dangerouslySetInnerHTML={{ __html: parsedContent }}
                                />
                                {renderFiles()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
