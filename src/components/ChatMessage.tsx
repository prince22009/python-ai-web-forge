import { type Message } from "@/lib/chat-stream";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
}

const ChatMessage = ({ message, isLatest }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary/10 text-foreground border border-primary/20"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    </div>
  );
};

export default ChatMessage;
