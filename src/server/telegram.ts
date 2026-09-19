import type { CyberLabAlert } from "../types";

const TELEGRAM_API_BASE = "https://api.telegram.org";

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return null;
  }

  return {
    token,
    chatId,
  };
}

export async function sendTelegramMessage(
  text: string
): Promise<boolean> {
  const config = getTelegramConfig();

  if (!config) {
    console.warn(
      "[Telegram] Telegram configuration is missing."
    );
    return false;
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error(
        "[Telegram] Failed to send message:",
        result
      );
      return false;
    }

    console.log(
      "[Telegram] Message sent successfully."
    );

    return true;
  } catch (error) {
    console.error(
      "[Telegram] Request failed:",
      error
    );

    return false;
  }
}

export async function sendTelegramDocument(
  document: Buffer,
  filename: string,
  caption?: string,
  chatIdOverride?: number
): Promise<boolean> {
  const config = getTelegramConfig();

  if (!config) {
    console.warn(
      "[Telegram] Telegram configuration is missing."
    );
    return false;
  }

  try {
    const form = new FormData();

    form.append(
      "chat_id",
      String(chatIdOverride ?? config.chatId)
    );

    form.append(
      "document",
      new Blob(
        [document],
        { type: "application/pdf" }
      ),
      filename
    );

    if (caption) {
      form.append("caption", caption);
    }

    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${config.token}/sendDocument`,
      {
        method: "POST",
        body: form,
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error(
        "[Telegram] Failed to send document:",
        result
      );
      return false;
    }

    console.log(
      `[Telegram] Document sent successfully: ${filename}`
    );

    return true;
  } catch (error) {
    console.error(
      "[Telegram] Document request failed:",
      error
    );

    return false;
  }
}

export async function sendCyberLabAlertToTelegram(
  alert: CyberLabAlert
): Promise<boolean> {
  const emoji =
    alert.severity === "critical"
      ? "🔴"
      : alert.severity === "high"
      ? "🟠"
      : alert.severity === "medium"
      ? "🟡"
      : "🔵";

  const message = [
    `${emoji} CYBERLAB SECURITY ALERT`,
    "",
    `Severity: ${alert.severity.toUpperCase()}`,
    `Priority: ${alert.priority.toUpperCase()}`,
    "",
    `Title: ${alert.title}`,
    "",
    alert.message,
    "",
    `Source: ${alert.source}`,
    `Type: ${alert.type}`,
    alert.target
      ? `Target: ${alert.target}`
      : "",
    "",
    `Status: ${alert.status.toUpperCase()}`,
    `Alert ID: ${alert.id}`,
    "",
    "CyberLab Security Operations",
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(message);
}
