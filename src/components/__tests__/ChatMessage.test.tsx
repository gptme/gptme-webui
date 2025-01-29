import { render, screen } from "@testing-library/react";
import { ChatMessage } from "../ChatMessage";
import type { Message } from "@/types/conversation";

describe("ChatMessage", () => {
    it("renders user message", () => {
        const message: Message = {
            role: "user",
            content: "Hello",
            timestamp: new Date().toISOString(),
        };
        
        render(<ChatMessage message={message} />);
        expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("renders assistant message", () => {
        const message: Message = {
            role: "assistant",
            content: "Hi there!",
            timestamp: new Date().toISOString(),
        };
        
        render(<ChatMessage message={message} />);
        expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });
});