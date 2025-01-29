import type { Message } from "@/types/conversation";

export const isNonUserMessage = (role?: string) => 
    role === "assistant" || role === "system";

export const getMessageChainType = (
    message: Message,
    previousMessage: Message | null,
    nextMessage: Message | null
) => {
    const isChainStart = !previousMessage || previousMessage.role === "user";
    const isChainEnd = !nextMessage || nextMessage.role === "user";
    const isPartOfChain = isNonUserMessage(message.role);

    if (!isPartOfChain) return "standalone";
    if (isChainStart && isChainEnd) return "standalone";
    if (isChainStart) return "start";
    if (isChainEnd) return "end";
    return "middle";
};