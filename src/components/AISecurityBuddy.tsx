import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  ShieldCheck,
  User,
  Loader2,
  AlertTriangle,
  Clock3,
  Trash2,
  X,
  MessageCircle,
  Minimize2,
} from "lucide-react";

const normalizeAIContent = (content: string) => {
  return content
    .replace(/&#x20;/g, " ")
    .replace(/\\([*_`])/g, "$1")
    .trim();
};

const renderInlineMarkdown = (text: string) => {
  const normalized = text
    .replace(/&#x20;/g, " ")
    .replace(/\\([*_`])/g, "$1");

  const parts = normalized.split(
    /(\*\*.*?\*\*|\*.*?\*|`.*?`)/
  );

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**") &&
      part.length > 4
    ) {
      return (
        <strong
          key={index}
          className="font-semibold text-cyan-200"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith("`") &&
      part.endsWith("`") &&
      part.length > 2
    ) {
      return (
        <code
          key={index}
          className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      part.length > 2
    ) {
      return (
        <em
          key={index}
          className="italic text-slate-300"
        >
          {part.slice(1, -1)}
        </em>
      );
    }

    return (
      <React.Fragment key={index}>
        {part}
      </React.Fragment>
    );
  });
};
const renderAIMessage = (content: string) => {
  const normalized = normalizeAIContent(content);
  const lines = normalized.split("\n");

  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
        codeLines = [];
      } else {
        elements.push(
          <div
            key={`code-${index}`}
            className="my-3 overflow-hidden rounded-lg border border-slate-700 bg-black/60"
          >
            {codeLanguage && (
              <div className="border-b border-slate-800 bg-slate-900/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {codeLanguage}
              </div>
            )}

            <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
              <code>{codeLines.join("\n")}</code>
            </pre>
          </div>
        );

        inCodeBlock = false;
        codeLanguage = "";
        codeLines = [];
      }

      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      elements.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          key={`heading-${index}`}
          className="mt-3 mb-1 font-semibold text-sm text-cyan-300"
        >
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3
          key={`heading-${index}`}
          className="mt-3 mb-1 font-semibold text-sm text-cyan-300"
        >
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      elements.push(
        <div
          key={`bullet-${index}`}
          className="flex gap-2 pl-1"
        >
          <span className="text-cyan-400">•</span>
          <span>{renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ""))}</span>
        </div>
      );
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)$/);

      elements.push(
        <div
          key={`number-${index}`}
          className="flex gap-2 pl-1"
        >
          <span className="min-w-4 text-cyan-400">
            {match?.[1]}.
          </span>
          <span>
            {renderInlineMarkdown(match?.[2] || trimmed)}
          </span>
        </div>
      );
      return;
    }

    elements.push(
      <p key={`line-${index}`} className="leading-relaxed">
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  return elements;
};

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export const AISecurityBuddy: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hello. I’m CyberLab AI Security Buddy, your defensive cybersecurity assistant. Ask me about vulnerabilities, Greenbone/OpenVAS results, network scans, Observium, Linux security, CVEs, ports, services, or remediation.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retrySeconds, setRetrySeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (retrySeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRetrySeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [retrySeconds]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const trimmedMessage = input.trim();

    if (
      !trimmedMessage ||
      isLoading ||
      retrySeconds > 0
    ) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmedMessage,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput("");
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: trimmedMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retry =
            Number(data?.retryAfterSeconds) || 60;

          setRetrySeconds(retry);

          setErrorMessage(
            data?.error ||
              "Gemini is temporarily rate-limited. Please try again later."
          );

          return;
        }

        throw new Error(
          data?.error ||
            "AI Security Buddy failed to respond."
        );
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
        content:
       (data?.reply || "I was unable to generate a response. Don't worry ReggieTech will fix it")
       .replace(/&#x20;/g, " "),
        },
      ]);
    } catch (error: any) {
      console.error(
        "AI Security Buddy request failed:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to connect to CyberLab AI Security Buddy."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        content:
          "Chat cleared. I’m ready to help with your next cybersecurity question.",
      },
    ]);

    setErrorMessage("");
    setRetrySeconds(0);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Floating AI Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Open CyberLab AI Security Buddy"
          aria-label="Open CyberLab AI Security Buddy"
          className="fixed bottom-6 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/50 bg-slate-950 text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.25)] transition-all duration-200 hover:scale-105 hover:border-cyan-300 hover:bg-cyan-950/80 hover:text-cyan-300"
        >
          <Bot className="h-6 w-6" />

          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-slate-950 bg-emerald-400" />
          </span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <section className="fixed bottom-6 right-6 z-[9999] flex h-[min(680px,calc(100vh-48px))] w-[min(430px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950 shadow-[0_20px_70px_rgba(0,0,0,0.65),0_0_40px_rgba(34,211,238,0.08)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                <Bot className="h-5 w-5 text-cyan-400" />

                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
                    CyberLab AI
                  </h2>

                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase text-emerald-400">
                    Online
                  </span>
                </div>

                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  Security Technician Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                disabled={isLoading}
                title="Clear conversation"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize CyberLab AI"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <Minimize2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close CyberLab AI"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Security Banner */}
          <div className="flex items-start gap-2 border-b border-cyan-900/30 bg-cyan-950/10 px-4 py-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />

            <p className="text-[9px] leading-relaxed text-slate-500">
              Authorized defensive security use only. Verify
              commands and findings before applying changes.
            </p>
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#070b12] p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                    <Bot className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                )}

                <div
                  className={`max-w-[84%] rounded-xl border px-3 py-2.5 ${
                    message.role === "user"
                      ? "border-blue-500/20 bg-blue-950/30 text-slate-200"
                      : "border-slate-800 bg-slate-900/70 text-slate-300"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    {message.role === "user" ? (
                      <>
                        <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-blue-400">
                          Technician
                        </span>

                        <User className="h-2.5 w-2.5 text-blue-400" />
                      </>
                    ) : (
                      <>
                        <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                          CyberLab AI
                        </span>

                        <ShieldCheck className="h-2.5 w-2.5 text-cyan-400" />
                      </>
                    )}
                  </div>

                 <div className="whitespace-pre-wrap text-xs leading-relaxed">
                  {message.role === "assistant"
                  ? renderAIMessage(message.content)
                  : message.content}
                 </div>  
                </div>

                {message.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10">
                    <User className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                  <Bot className="h-3.5 w-3.5 text-cyan-400" />
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    ANALYZING...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error / Quota */}
          {errorMessage && (
            <div className="border-t border-red-900/40 bg-red-950/20 px-4 py-2.5">
              <div className="flex items-start gap-2">
                {retrySeconds > 0 ? (
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                )}

                <div className="min-w-0">
                  <p className="text-[10px] leading-relaxed text-red-300">
                    {errorMessage}
                  </p>

                  {retrySeconds > 0 && (
                    <p className="mt-1 text-[9px] font-mono uppercase text-amber-400">
                      Retry available in {retrySeconds}s
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-800 bg-slate-900/95 p-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleKeyDown}
                disabled={
                  isLoading ||
                  retrySeconds > 0
                }
                rows={2}
                maxLength={4000}
                placeholder={
                  retrySeconds > 0
                    ? `Please wait ${retrySeconds}s...`
                    : "Ask a security question..."
                }
                className="min-h-[48px] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={
                  !input.trim() ||
                  isLoading ||
                  retrySeconds > 0
                }
                className="flex w-12 shrink-0 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 transition-all hover:border-cyan-400 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
                title="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[8px] font-mono uppercase tracking-wider text-slate-600">
                Enter to send • Shift+Enter for new line
              </span>

              <span className="text-[8px] font-mono text-slate-600">
                {input.length}/4000
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Small launcher label */}
      {!isOpen && (
        <div className="pointer-events-none fixed bottom-8 right-24 z-[9997] hidden rounded-lg border border-slate-800 bg-slate-950/95 px-3 py-2 shadow-xl lg:block">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-cyan-400" />

            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-300">
              AI Security Buddy
            </span>
          </div>
        </div>
      )}
    </>
  );
};