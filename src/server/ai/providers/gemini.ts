import type { GoogleGenAI } from "@google/genai";
import type {
  CyberLabAIGenerateRequest,
  CyberLabAIGenerateResponse,
  CyberLabAIProvider,
} from "../provider";

export const GEMINI_AI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
] as const;

export class GeminiAIProvider implements CyberLabAIProvider {
  readonly id = "gemini";
  readonly displayName = "Google Gemini";

  readonly models = GEMINI_AI_MODELS;

  constructor(private readonly client: GoogleGenAI) {}

  async generateContent(
    request: CyberLabAIGenerateRequest
  ): Promise<CyberLabAIGenerateResponse> {
    const response = await this.client.models.generateContent({
      model: request.model,
      contents: request.contents,
      ...(request.config
        ? {
            config: request.config,
          }
        : {}),
    });

    return {
      text: response.text,
      model: response.modelVersion,
    };
  }
}
