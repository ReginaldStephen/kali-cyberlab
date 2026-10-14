import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let elevenLabsClient: ElevenLabsClient | null = null;

function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "ElevenLabs is not configured. Please check ELEVENLABS_API_KEY."
    );
  }

  if (!elevenLabsClient) {
    elevenLabsClient = new ElevenLabsClient({
      apiKey,
    });
  }

  return elevenLabsClient;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(
    process.env.ELEVENLABS_API_KEY?.trim() &&
      process.env.ELEVENLABS_VOICE_ID?.trim()
  );
}

export async function generateCyberLabSpeech(
  text: string
): Promise<Buffer> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  const modelId =
    process.env.ELEVENLABS_MODEL_ID?.trim() ||
    "eleven_flash_v2_5";

  if (!voiceId) {
    throw new Error(
      "ElevenLabs voice is not configured. Please check ELEVENLABS_VOICE_ID."
    );
  }

  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error(
      "Cannot generate speech from an empty response."
    );
  }

  const client = getElevenLabsClient();

  const audioStream = await client.textToSpeech.convert(
    voiceId,
    {
      text: trimmedText,
      modelId,
      outputFormat: "mp3_44100_128",
    }
  );

  const reader = audioStream.getReader();
  const chunks: Buffer[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (value) {
        chunks.push(Buffer.from(value));
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}
