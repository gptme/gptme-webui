import { render, screen } from "@testing-library/react";
import { ChatMessage } from "../ChatMessage";

describe("ChatMessage", () => {
    it("renders user message", () => {
        const message = {
            role: "user",
            content: "Hello",
            timestamp: new Date().toISOString(),
        };
        
        render(<ChatMessage message={message} />);
        expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("renders assistant message", () => {
        const message = {
            role: "assistant",
            content: "Hi there!",
            timestamp: new Date().toISOString(),
        };
        
        render(<ChatMessage message={message} />);
        expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });
});