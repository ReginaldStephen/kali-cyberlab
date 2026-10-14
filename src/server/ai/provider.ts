export interface CyberLabAIContentPart {
  text: string;
}

export interface CyberLabAIContent {
  role?: string;
  parts: CyberLabAIContentPart[];
}

export interface CyberLabAIGenerateRequest {
  model: string;
  contents: CyberLabAIContent[];
  config?: {
    responseMimeType?: string;
  };
}

export interface CyberLabAIGenerateResponse {
  text?: string;
  model?: string;
}

export interface CyberLabAIProvider {
  readonly id: string;
  readonly displayName: string;
  readonly models: readonly string[];

  generateContent(
    request: CyberLabAIGenerateRequest
  ): Promise<CyberLabAIGenerateResponse>;
}

export type CyberLabAIProviderFactory =
  () => CyberLabAIProvider | null;
