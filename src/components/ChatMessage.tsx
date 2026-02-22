import { type Message, type MessageContent, getTextContent } from "@/lib/chat-stream";
import { Bot, User, Volume2, VolumeX } from "lucide-react";
import { useState, useRef } from "react";

interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
}

const ChatMessage = ({ message, isLatest }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const text = getTextContent(message);
  const images = typeof message.content !== "string"
    ? (message.content as MessageContent[]).filter(c => c.type === "image_url")
    : [];
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggleSpeak = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    utteranceRef.current = u;
    speechSynthesis.speak(u);
    setIsSpeaking(true);
  };

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        isUser ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? "bg-primary/10 text-foreground border border-primary/20"
          : "bg-secondary text-secondary-foreground"
      }`}>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((img, i) => (
              <img key={i} src={(img as any).image_url.url} alt="Uploaded"
                className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{text}</div>
        {!isUser && text && (
          <button onClick={toggleSpeak}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
            {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            {isSpeaking ? "Stop" : "Speak"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
