import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic, MicOff, Image, Camera, LogOut } from "lucide-react";
import { type Message, type MessageContent, streamChat, getTextContent } from "@/lib/chat-stream";
import ChatMessage from "@/components/ChatMessage";
import TypingIndicator from "@/components/TypingIndicator";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a Python hello world",
  "What's the meaning of life?",
  "Help me write a poem",
];

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) navigate("/auth");
  }, [session, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const imgs: string[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) { toast.error("Only images are supported"); continue; }
      if (f.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); continue; }
      imgs.push(await toBase64(f));
    }
    setPendingImages((prev) => [...prev, ...imgs]);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && pendingImages.length === 0) return;
    if (isLoading) return;

    const content: MessageContent[] = [];
    pendingImages.forEach((url) => content.push({ type: "image_url", image_url: { url } }));
    if (trimmed) content.push({ type: "text", text: trimmed });

    const userMsg: Message = {
      role: "user",
      content: content.length === 1 && content[0].type === "text" ? trimmed : content,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setIsLoading(true);

    let assistantContent = "";
    const upsert = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant")
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        onError: (err) => { toast.error(err); setIsLoading(false); },
      });
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Speech recognition not supported in this browser"); return; }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => { setIsListening(false); toast.error("Could not recognize speech"); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="glass-surface flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary neon-text" />
          <h1 className="text-lg font-semibold text-foreground tracking-wide">
            Neon<span className="text-primary">AI</span>
          </h1>
        </div>
        <button onClick={() => { signOut(); navigate("/auth"); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-4">
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 neon-glow">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Hello! I'm <span className="text-primary neon-text">NeonAI</span>
              </h2>
              <p className="text-muted-foreground max-w-md">
                Powered by GPT-5.2. Send text, images, or use your voice — I can do it all.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-secondary-foreground text-left hover:bg-secondary hover:border-primary/30 transition-all duration-200">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} isLatest={i === messages.length - 1} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Pending images preview */}
      {pendingImages.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <div className="mx-auto max-w-3xl flex gap-2 overflow-x-auto">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative shrink-0">
                <img src={img} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
                <button onClick={() => setPendingImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="glass-surface flex items-end gap-2 rounded-2xl px-4 py-3 focus-within:neon-glow transition-shadow duration-300">
            {/* Image upload */}
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
              onChange={(e) => handleFiles(e.target.files)} />
            <button onClick={() => fileInputRef.current?.click()} title="Upload image"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
              <Image className="h-4 w-4" />
            </button>

            {/* Camera */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => handleFiles(e.target.files)} />
            <button onClick={() => cameraInputRef.current?.click()} title="Take photo"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
              <Camera className="h-4 w-4" />
            </button>

            {/* Voice input */}
            <button onClick={toggleListening} title={isListening ? "Stop listening" : "Voice input"}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                isListening
                  ? "bg-destructive/20 text-destructive animate-pulse"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              }`}>
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Ask NeonAI anything..." rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none max-h-32"
              disabled={isLoading} />

            <button onClick={() => send(input)}
              disabled={(!input.trim() && pendingImages.length === 0) || isLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Powered by GPT-5.2 · Voice · Vision · Responses may be inaccurate
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
