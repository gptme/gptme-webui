import { render, screen } from "@testing-library/react";
import { ChatMessage } from "../ChatMessage";
import '@testing-library/jest-dom';

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

    it("renders system message with monospace font", () => {
        const message = {
            role: "system",
            content: "System message",
            timestamp: new Date().toISOString(),
        };
        
        const { container } = render(<ChatMessage message={message} />);
        const messageElement = container.querySelector('.font-mono');
        expect(messageElement).toBeInTheDocument();
    });
});