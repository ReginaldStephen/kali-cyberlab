import React, { useEffect, useRef, useState } from "react";
import type { CyberLabAIAction } from "../types/cyberlabAI";
import {
  Activity,
  ChevronDown,
  ChevronUp,
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
  Mic,
  MicOff,
  Volume2,
  Square,
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

type SpeechRecognitionEventLike = Event & {
  results: SpeechRecognitionResultList;
};

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface CyberLabAIRuntimeRequestRecord {
  timestamp: string;
  providerId: string;
  providerDisplayName: string;
  requestedModel: string;
  returnedModel: string | null;
  attempt: number;
  success: boolean;
  statusCode: number | null;
  error: string | null;
}

interface CyberLabAIRuntimeStatus {
  providerId: string | null;
  providerDisplayName: string | null;
  requestedModel: string | null;
  returnedModel: string | null;
  status: "idle" | "success" | "error";
  lastRequestAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  recentRequests: CyberLabAIRuntimeRequestRecord[];
}

interface AISecurityBuddyProps {
  onAction?: (action: CyberLabAIAction) => void;
}

export const AISecurityBuddy: React.FC<AISecurityBuddyProps> = ({
  onAction,
}) => {
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

  const [aiRuntime, setAIRuntime] =
    useState<CyberLabAIRuntimeStatus | null>(null);

  const [availableAIModels, setAvailableAIModels] =
    useState<string[]>([]);

  const [selectedAIModel, setSelectedAIModel] =
    useState("");

  const [aiRuntimeError, setAIRuntimeError] =
    useState("");

  const [isLoadingAIRuntime, setIsLoadingAIRuntime] =
    useState(false);

  const [isAIRoutingHistoryOpen, setIsAIRoutingHistoryOpen] =
    useState(false);

  const [voicePermission, setVoicePermission] = useState<
    "unknown" | "requesting" | "granted" | "denied"
  >("unknown");

  const [voiceState, setVoiceState] = useState<
    "off" | "standby" | "listening" | "processing" | "speaking"
  >("off");

  const [voiceError, setVoiceError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const wakeRecognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  const commandRecognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  // Wait for a sustained pause before submitting a spoken command.
  // This prevents partial speech from being sent while the user is still talking.
  const commandSilenceTimerRef = useRef<number | null>(null);
  const commandTranscriptRef = useRef("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const attentiveRef = useRef(false);
  const mountedRef = useRef(true);

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
    mountedRef.current = true;

    void requestVoiceAccess();

    return () => {
      mountedRef.current = false;

      wakeRecognitionRef.current?.abort();
      commandRecognitionRef.current?.abort();

      wakeRecognitionRef.current = null;
      commandRecognitionRef.current = null;

      if (audioRef.current) {
        audioRef.current.pause();

        if (audioRef.current.src.startsWith("blob:")) {
          URL.revokeObjectURL(audioRef.current.src);
        }

        audioRef.current = null;
      }
    };
  }, []);

  const loadAIRuntimeStatus = async () => {
    if (!mountedRef.current) {
      return;
    }

    setIsLoadingAIRuntime(true);

    try {
      const response = await fetch("/api/ai/status", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `CyberLab AI status returned ${response.status}.`
        );
      }

      if (!data?.runtime) {
        throw new Error(
          "CyberLab AI runtime status was not returned."
        );
      }

      const providerModels = Array.isArray(data?.providers)
        ? data.providers
            .flatMap((provider: any) =>
              Array.isArray(provider?.models)
                ? provider.models
                : []
            )
            .filter(
              (model: unknown): model is string =>
                typeof model === "string" &&
                model.trim().length > 0
            )
        : [];

      const uniqueProviderModels = Array.from(
        new Set(providerModels)
      );

      if (mountedRef.current) {
        setAIRuntime(data.runtime);
        setAvailableAIModels(uniqueProviderModels);
        setAIRuntimeError("");
      }
    } catch (error: any) {
      console.error(
        "CyberLab AI runtime status error:",
        error
      );

      if (mountedRef.current) {
        setAIRuntimeError(
          error?.message ||
            "Unable to retrieve AI runtime status."
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoadingAIRuntime(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadAIRuntimeStatus();

    const timer = window.setInterval(() => {
      void loadAIRuntimeStatus();
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const getSpeechRecognitionConstructor =
    (): SpeechRecognitionConstructor | null => {
      return (
        window.SpeechRecognition ||
        window.webkitSpeechRecognition ||
        null
      );
    };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();

      if (audioRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      audioRef.current = null;
    }

    if (mountedRef.current) {
      setVoiceState(
        voicePermission === "granted" ? "standby" : "off"
      );
    }
  };

  const speakResponse = async (text: string) => {
    try {
      if (!text.trim()) {
        return;
      }

      stopSpeaking();

      if (mountedRef.current) {
        setVoiceState("speaking");
      }

      const response = await fetch("/api/ai/speech", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.error ||
            `Voice response failed with status ${response.status}.`
        );
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;

        if (
          mountedRef.current &&
          voicePermission === "granted"
        ) {
          setVoiceState("standby");

          if (!attentiveRef.current) {
            startWakeWordListening();
          }
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;

        if (mountedRef.current) {
          setVoiceError(
            "CyberLab could not play the voice response."
          );

          setVoiceState(
            voicePermission === "granted" ? "standby" : "off"
          );
        }
      };

      await audio.play();
    } catch (error: any) {
      console.error("CyberLab voice output error:", error);

      if (mountedRef.current) {
        setVoiceError(
          error?.message ||
            "CyberLab could not generate the voice response."
        );

        setVoiceState(
          voicePermission === "granted" ? "standby" : "off"
        );
      }
    }
  };

  const sendVoiceMessage = async (message: string) => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: "user",
        content: trimmedMessage,
      },
    ]);

    setErrorMessage("");
    setVoiceError("");
    setIsLoading(true);
    setVoiceState("processing");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
          ...(selectedAIModel
            ? { model: selectedAIModel }
            : {}),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `CyberLab AI returned status ${response.status}.`
        );
      }

      const aiReply =
        typeof data?.reply === "string"
          ? data.reply
          : typeof data?.reply?.reply === "string"
            ? data.reply.reply
            : "";

      const reply =
        (aiReply ||
          "I was unable to generate a response. Don't worry ReggieTech will fix it")
          .replace(/&#x20;/g, " ");

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: reply,
        },
      ]);

      const actions = Array.isArray(data?.actions)
        ? data.actions
        : Array.isArray(data?.reply?.actions)
          ? data.reply.actions
          : [];

      actions.forEach((action: CyberLabAIAction) => {
        onAction?.(action);
      });

      await speakResponse(reply);
    } catch (error: any) {
      console.error("CyberLab voice command error:", error);

      if (mountedRef.current) {
        setVoiceError(
          error?.message ||
            "CyberLab could not process the voice command."
        );

        setVoiceState(
          voicePermission === "granted" ? "standby" : "off"
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const startCommandListening = () => {
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      setVoiceError(
        "Speech recognition is not available in this browser."
      );
      setVoiceState("standby");
      return;
    }

    commandRecognitionRef.current?.abort();

    if (commandSilenceTimerRef.current !== null) {
      window.clearTimeout(commandSilenceTimerRef.current);
      commandSilenceTimerRef.current = null;
    }

    commandTranscriptRef.current = "";

    const recognition = new Recognition();

    commandRecognitionRef.current = recognition;

    // Keep listening while the user is speaking. We finalize the command
    // ourselves after 3 seconds of silence instead of trusting the browser
    // to decide when the user has finished.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    attentiveRef.current = true;

    setVoiceState("listening");
    setVoiceError("");

    const finalizeCommand = () => {
      if (commandSilenceTimerRef.current !== null) {
        window.clearTimeout(commandSilenceTimerRef.current);
        commandSilenceTimerRef.current = null;
      }

      const transcript = commandTranscriptRef.current
        .replace(/\s+/g, " ")
        .trim();

      commandTranscriptRef.current = "";
      commandRecognitionRef.current = null;
      attentiveRef.current = false;

      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      try {
        recognition.stop();
      } catch {
        // Recognition may already have ended.
      }

      if (transcript) {
        console.log(
          "CyberLab voice command finalized after 3 seconds of silence:",
          transcript
        );

        void sendVoiceMessage(transcript);
      } else {
        setVoiceState("standby");
        startWakeWordListening();
      }
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        commandTranscriptRef.current = transcript;
      }

      // Every new speech result resets the 3-second silence window.
      if (commandSilenceTimerRef.current !== null) {
        window.clearTimeout(commandSilenceTimerRef.current);
      }

      commandSilenceTimerRef.current = window.setTimeout(() => {
        finalizeCommand();
      }, 3000);
    };

    recognition.onerror = (event: any) => {
      console.error(
        "CyberLab command speech recognition error:",
        event
      );

      if (commandSilenceTimerRef.current !== null) {
        window.clearTimeout(commandSilenceTimerRef.current);
        commandSilenceTimerRef.current = null;
      }

      commandRecognitionRef.current = null;
      attentiveRef.current = false;
      commandTranscriptRef.current = "";

      if (mountedRef.current) {
        setVoiceError(
          event?.error === "no-speech"
            ? "I didn't hear a command."
            : "CyberLab could not understand the voice command."
        );

        setVoiceState("standby");
      }

      startWakeWordListening();
    };

    recognition.onend = () => {
      /*
       * Chrome can end SpeechRecognition even when continuous=true.
       * If we already have a silence timer running, allow it to finalize
       * the accumulated command instead of submitting early.
       */
      if (
        mountedRef.current &&
        attentiveRef.current &&
        commandTranscriptRef.current.trim()
      ) {
        console.log(
          "CyberLab command recognition ended; waiting for the 3-second silence window."
        );

        if (commandSilenceTimerRef.current === null) {
          commandSilenceTimerRef.current = window.setTimeout(() => {
            finalizeCommand();
          }, 3000);
        }

        return;
      }

      commandRecognitionRef.current = null;

      if (
        mountedRef.current &&
        !attentiveRef.current &&
        voicePermission === "granted"
      ) {
        setVoiceState("standby");
        startWakeWordListening();
      }
    };

    try {
      recognition.start();

      console.log(
        "CyberLab command listener started — waiting for 3 seconds of silence before submitting."
      );
    } catch (error) {
      console.error(
        "CyberLab command recognition start error:",
        error
      );

      if (commandSilenceTimerRef.current !== null) {
        window.clearTimeout(commandSilenceTimerRef.current);
        commandSilenceTimerRef.current = null;
      }

      commandRecognitionRef.current = null;
      attentiveRef.current = false;
      commandTranscriptRef.current = "";

      setVoiceState("standby");
      startWakeWordListening();
    }
  };

  const startWakeWordListening = () => {
    const Recognition = getSpeechRecognitionConstructor();

    if (
      !Recognition ||
      !mountedRef.current ||
      voicePermission !== "granted" ||
      attentiveRef.current
    ) {
      return;
    }

    wakeRecognitionRef.current?.abort();

    const recognition = new Recognition();

    wakeRecognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    setVoiceState("standby");

    recognition.onstart = () => {
      console.log(
        "CyberLab wake-word listener started."
      );

      if (mountedRef.current) {
        setVoiceState("standby");
      }
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) =>
          Array.from(result)
            .map(
              (alternative) =>
                alternative?.transcript || ""
            )
            .join(" ")
        )
        .join(" ")
        .toLowerCase()
        .replace(/[.,!?;:]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      console.log(
        "CyberLab wake recognition:",
        transcript
      );

      const normalizedWakePhrase = transcript
        .replace(/\bcyber\s+lab\b/g, "cyberlab")
        .replace(/\bcyber\s+labs\b/g, "cyberlabs")
        .replace(/\bhey\s+cyber\s+lab\b/g, "hey cyberlab")
        .replace(/\bfive\b/g, "5")
        .replace(/\bfour\b/g, "4")
        .replace(/\bthree\b/g, "3")
        .replace(/\btwo\b/g, "2")
        .replace(/\bone\b/g, "1")
        .replace(/\s+/g, " ")
        .trim();

      const wakeDetected =
        normalizedWakePhrase.includes(
          "hey cyberlab 54321"
        ) ||
        normalizedWakePhrase.includes(
          "hey cyber lab 54321"
        ) ||
        normalizedWakePhrase.includes(
          "hey cyberlab five four three two one"
        ) ||
        normalizedWakePhrase.includes(
          "hey cyber lab five four three two one"
        );

      if (!wakeDetected) {
        return;
      }

      console.log(
        "CyberLab wake phrase detected:",
        normalizedWakePhrase
      );

      attentiveRef.current = true;

      wakeRecognitionRef.current?.stop();
      wakeRecognitionRef.current = null;

      setVoiceError("");
      setVoiceState("listening");

      window.setTimeout(() => {
        if (
          mountedRef.current &&
          voicePermission === "granted"
        ) {
          startCommandListening();
        }
      }, 150);
    };

    recognition.onerror = (event: any) => {
      console.error(
        "CyberLab wake-word recognition error:",
        event
      );

      wakeRecognitionRef.current = null;

      if (
        mountedRef.current &&
        voicePermission === "granted" &&
        !attentiveRef.current
      ) {
        setVoiceError(
          event?.error === "not-allowed"
            ? "Microphone access was blocked by the browser."
            : event?.error === "audio-capture"
              ? "The microphone could not be accessed."
              : ""
        );

        setVoiceState("standby");

        window.setTimeout(() => {
          if (
            mountedRef.current &&
            voicePermission === "granted" &&
            !attentiveRef.current
          ) {
            startWakeWordListening();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      wakeRecognitionRef.current = null;

      console.log(
        "CyberLab wake-word listener ended."
      );

      if (
        mountedRef.current &&
        voicePermission === "granted" &&
        !attentiveRef.current
      ) {
        window.setTimeout(() => {
          if (
            mountedRef.current &&
            voicePermission === "granted" &&
            !attentiveRef.current
          ) {
            startWakeWordListening();
          }
        }, 250);
      }
    };

    try {
      recognition.start();

      console.log(
        "CyberLab is listening for: Hey CyberLab 54321"
      );
    } catch (error) {
      console.error(
        "CyberLab wake-word recognition start error:",
        error
      );

      wakeRecognitionRef.current = null;
    }
  };

  const requestVoiceAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoicePermission("denied");
      setVoiceState("off");
      setVoiceError(
        "This browser does not provide microphone access."
      );
      return;
    }

    setVoicePermission("requesting");
    setVoiceError("");

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      stream.getTracks().forEach((track) => track.stop());

      if (!mountedRef.current) {
        return;
      }

      setVoicePermission("granted");
      setVoiceState("standby");

      window.setTimeout(() => {
        if (mountedRef.current) {
          startWakeWordListening();
        }
      }, 0);
    } catch (error: any) {
      console.error(
        "CyberLab microphone permission error:",
        error
      );

      if (!mountedRef.current) {
        return;
      }

      setVoicePermission("denied");
      setVoiceState("off");
      setVoiceError(
        "Microphone access was not granted. Text chat will continue to work normally."
      );
    }
  };

  const stopVoiceAssistant = () => {
    attentiveRef.current = false;

    if (commandSilenceTimerRef.current !== null) {
      window.clearTimeout(commandSilenceTimerRef.current);
      commandSilenceTimerRef.current = null;
    }

    commandTranscriptRef.current = "";

    wakeRecognitionRef.current?.abort();
    commandRecognitionRef.current?.abort();

    wakeRecognitionRef.current = null;
    commandRecognitionRef.current = null;

    stopSpeaking();

    if (mountedRef.current) {
      setVoiceState("off");
    }
  };

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
          ...(selectedAIModel
            ? { model: selectedAIModel }
            : {}),
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

      const aiReply =
        typeof data?.reply === "string"
          ? data.reply
          : typeof data?.reply?.reply === "string"
            ? data.reply.reply
            : "";

      const reply =
        (aiReply ||
          "I was unable to generate a response. Don't worry ReggieTech will fix it")
          .replace(/&#x20;/g, " ");

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: reply,
        },
      ]);

      const actions = Array.isArray(data?.actions)
        ? data.actions
        : Array.isArray(data?.reply?.actions)
          ? data.reply.actions
          : [];

      actions.forEach((action: CyberLabAIAction) => {
        onAction?.(action);
      });
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

          {/* AI Model Selector */}
          <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  AI Model
                </div>

                <p className="mt-0.5 truncate font-mono text-[7px] text-slate-700">
                  Select a model or allow automatic fallback
                </p>
              </div>

              <div className="relative shrink-0">
                <select
                  value={selectedAIModel}
                  onChange={(event) =>
                    setSelectedAIModel(event.target.value)
                  }
                  disabled={isLoading || isLoadingAIRuntime}
                  aria-label="Select CyberLab AI model"
                  className="h-8 max-w-[190px] appearance-none rounded-md border border-cyan-500/20 bg-slate-900 px-7 pl-2.5 font-mono text-[8px] font-semibold text-cyan-300 outline-none transition-colors hover:border-cyan-400/40 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    Auto / Fallback
                  </option>

                  {availableAIModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-cyan-500/60" />
              </div>
            </div>
          </div>

          {/* AI Runtime */}
          <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/5">
                  {isLoadingAIRuntime ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  ) : aiRuntime?.status === "error" ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      AI Runtime
                    </span>

                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        aiRuntime?.status === "success"
                          ? "animate-pulse bg-emerald-400"
                          : aiRuntime?.status === "error"
                            ? "bg-amber-400"
                            : "bg-slate-600"
                      }`}
                    />

                    <span
                      className={`font-mono text-[7px] font-bold uppercase ${
                        aiRuntime?.status === "success"
                          ? "text-emerald-400"
                          : aiRuntime?.status === "error"
                            ? "text-amber-400"
                            : "text-slate-600"
                      }`}
                    >
                      {aiRuntime?.status === "success"
                        ? "Online"
                        : aiRuntime?.status === "error"
                          ? "Error"
                          : "Idle"}
                    </span>
                  </div>

                  <p className="mt-0.5 truncate font-mono text-[8px] text-slate-600">
                    {aiRuntime?.providerDisplayName ||
                      "Detecting provider..."}
                  </p>
                </div>
              </div>

              <div className="min-w-0 text-right">
                <div className="truncate font-mono text-[8px] font-semibold text-cyan-400">
                  {aiRuntime?.returnedModel ||
                    aiRuntime?.requestedModel ||
                    "No model activity"}
                </div>

                <div className="mt-0.5 truncate font-mono text-[7px] text-slate-700">
                  {aiRuntime?.returnedModel
                    ? "ACTIVE MODEL"
                    : aiRuntimeError
                      ? "STATUS UNAVAILABLE"
                      : "AWAITING REQUEST"}
                </div>
              </div>
            </div>

            {aiRuntimeError ? (
              <div className="mt-1.5 truncate border-t border-slate-900 pt-1.5 font-mono text-[7px] text-amber-500/70">
                {aiRuntimeError}
              </div>
            ) : null}
          </div>

          {/* Model Routing History */}
          <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-2">
            <button
              type="button"
              onClick={() =>
                setIsAIRoutingHistoryOpen(
                  (current) => !current
                )
              }
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={isAIRoutingHistoryOpen}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-500/15 bg-cyan-500/5">
                  <Activity className="h-3 w-3 text-cyan-400" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      Model Routing History
                    </span>

                    <span className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-[7px] font-bold text-slate-600">
                      {aiRuntime?.recentRequests?.length || 0}
                    </span>
                  </div>

                  <p className="mt-0.5 truncate font-mono text-[7px] text-slate-700">
                    Provider attempts and fallback activity
                  </p>
                </div>
              </div>

              {isAIRoutingHistoryOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              )}
            </button>

            {isAIRoutingHistoryOpen ? (
              <div className="mt-2 space-y-1.5">
                {aiRuntime?.recentRequests?.length ? (
                  aiRuntime.recentRequests.map(
                    (request, index) => (
                      <div
                        key={`${request.timestamp}-${request.attempt}-${index}`}
                        className="rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-mono text-[8px] font-semibold text-cyan-400">
                              {request.requestedModel}
                            </div>

                            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-[7px] text-slate-600">
                              <span className="truncate">
                                {request.returnedModel
                                  ? `→ ${request.returnedModel}`
                                  : "→ FAILED"}
                              </span>

                              <span className="shrink-0 text-slate-800">
                                •
                              </span>

                              <span className="shrink-0">
                                Attempt {request.attempt}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase ${
                              request.success
                                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                                : "border-amber-500/20 bg-amber-500/5 text-amber-400"
                            }`}
                          >
                            {request.success
                              ? "Success"
                              : request.statusCode
                                ? `${request.statusCode}`
                                : "Failed"}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-1.5">
                          <span className="truncate font-mono text-[7px] text-slate-700">
                            {request.providerDisplayName}
                          </span>

                          <span className="shrink-0 font-mono text-[7px] text-slate-700">
                            {new Date(
                              request.timestamp
                            ).toLocaleTimeString()}
                          </span>
                        </div>

                        {request.error ? (
                          <div className="mt-1 truncate font-mono text-[7px] text-amber-500/70">
                            {request.error}
                          </div>
                        ) : null}
                      </div>
                    )
                  )
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/30 px-3 py-2.5 text-center font-mono text-[7px] text-slate-700">
                    No model routing activity recorded yet.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Voice Assistant */}
          <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    voiceState === "listening"
                      ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                      : voiceState === "speaking"
                        ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                        : voiceState === "processing"
                          ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                          : voicePermission === "denied"
                            ? "border-red-400/30 bg-red-400/5 text-red-400"
                            : "border-slate-700 bg-slate-900 text-slate-500"
                  }`}
                >
                  {voiceState === "speaking" ? (
                    <Volume2 className="h-4 w-4" />
                  ) : voiceState === "listening" ? (
                    <Mic className="h-4 w-4" />
                  ) : voicePermission === "denied" ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-300">
                      Voice Assistant
                    </span>

                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        voiceState === "listening"
                          ? "animate-pulse bg-cyan-400"
                          : voiceState === "speaking"
                            ? "animate-pulse bg-emerald-400"
                            : voiceState === "processing"
                              ? "animate-pulse bg-amber-400"
                              : voicePermission === "denied"
                                ? "bg-red-400"
                                : "bg-slate-600"
                      }`}
                    />
                  </div>

                  <p className="mt-0.5 truncate text-[8px] text-slate-600">
                    {voicePermission === "denied"
                      ? "Microphone access denied — text chat remains available"
                      : voiceState === "listening"
                        ? "Listening for your command..."
                        : voiceState === "processing"
                          ? "CyberLab AI is processing..."
                          : voiceState === "speaking"
                            ? "CyberLab AI is speaking..."
                            : "Say “Hey CyberLab 54321” to activate"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (voiceState === "listening") {
                      stopVoiceAssistant();
                    } else {
                      void startCommandListening();
                    }
                  }}
                  disabled={
                    voicePermission !== "granted" ||
                    voiceState === "processing" ||
                    voiceState === "speaking"
                  }
                  title={
                    voiceState === "listening"
                      ? "Stop listening"
                      : "Start listening"
                  }
                  className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[8px] font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                    voiceState === "listening"
                      ? "border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/20"
                      : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  }`}
                >
                  {voiceState === "listening" ? (
                    <>
                      <Square className="h-2.5 w-2.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="h-3 w-3" />
                      Listen
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-900 pt-2">
              <span className="font-mono text-[7px] uppercase tracking-wider text-slate-700">
                Wake phrase
              </span>

              <span className="font-mono text-[8px] font-semibold text-cyan-500/70">
                HEY CYBERLAB 54321
              </span>
            </div>
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