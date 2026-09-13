import type { GoogleGenAI } from "@google/genai";

type LiveContextProvider = () => Promise<unknown>;
type AIClientProvider = () => GoogleGenAI | null;

let liveContextProvider: LiveContextProvider | null = null;
let aiClientProvider: AIClientProvider | null = null;

export function registerCyberLabAIClientProvider(
  provider: AIClientProvider
): void {
  aiClientProvider = provider;
}

export function registerCyberLabLiveContextProvider(
  provider: LiveContextProvider
): void {
  liveContextProvider = provider;
}

function getLiveContextProvider(): LiveContextProvider {
  if (!liveContextProvider) {
    throw new Error(
      "CyberLab live context provider has not been registered."
    );
  }

  return liveContextProvider;
}

export async function generateCyberLabAIResponse(
  ai: GoogleGenAI | null,
  message: string
): Promise<string> {
  const resolvedAI = ai || aiClientProvider?.() || null;

  if (!resolvedAI) {
    throw new Error(
      "Gemini AI is not configured. Please check GEMINI_API_KEY."
    );
  }

  const trimmedMessage = message.trim();

  let liveContext: unknown;

  try {
    liveContext = await getLiveContextProvider()();
  } catch (contextError: any) {
    console.error(
      "CyberLab live context error:",
      contextError
    );

    liveContext = {
      status: "unavailable",
      error:
        contextError?.message ||
        "Live CyberLab context is temporarily unavailable.",
    };
  }

  const systemInstruction = `
You are CyberLab AI Security Buddy, an experienced defensive cybersecurity assistant supporting Security Technicians.

You are part of Kali CyberLab, a defensive security operations platform.

Your role is to:
- Explain cybersecurity concepts clearly.
- Help technicians understand security findings.
- Explain Greenbone/OpenVAS vulnerability results.
- Help interpret network scanning results.
- Help understand Observium monitoring information.
- Recommend defensive remediation and hardening.
- Assist with Kali Linux and Linux security troubleshooting.
- Explain CVEs, vulnerabilities, services, ports, and security risks.
- Provide practical, technically accurate guidance.

Always prioritize authorized, defensive security work.

When discussing commands:
- Explain what the command does.
- Prefer safe inspection and verification commands first.
- Clearly warn before commands that could modify systems.
- Never assume the technician is authorized to attack an external system.
- Do not provide instructions for credential theft, malware deployment, persistence, evasion, or unauthorized compromise.

Be concise but technically useful. If the technician's question is ambiguous, ask a focused clarification question.

You are speaking directly to a Security Technician working inside CyberLab.
`;

  const response = await resolvedAI.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              systemInstruction +
              "\n\nCURRENT CYBERLAB LIVE CONTEXT:\n" +
              "The following JSON represents the current " +
              "operational state of CyberLab. Use it when " +
              "answering questions about CyberLab activity, " +
              "scans, monitoring, vulnerabilities, system " +
              "health, or recent operations. Do not invent " +
              "values that are not present in this context. " +
              "If a section is unavailable or empty, say so " +
              "clearly.\n\n" +
              JSON.stringify(liveContext, null, 2) +
              "\n\nTechnician message:\n" +
              trimmedMessage,
          },
        ],
      },
    ],
  });

  return (
    response.text?.trim() ||
    "I was unable to generate a response."
  );
}
