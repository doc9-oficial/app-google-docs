import docgo from "docgo-sdk";

import { DocsDocument, ServiceAccount } from "./types";

function getServiceAccountCredentials(): ServiceAccount | null {
  const credsString =
    docgo.getEnv("GOOGLE_SERVICE_ACCOUNT") ||
    docgo.getEnv("DOCGO_GOOGLE_SERVICE_ACCOUNT") ||
    docgo.getEnv("googleServiceAccount") ||
    docgo.getEnv("docgoGoogleServiceAccount") ||
    null;

  if (!credsString) return null;

  try {
    return JSON.parse(credsString);
  } catch (err) {
    throw new Error("Service account credentials inválidas: " + err);
  }
}

function parseToBase64Url(input: string | Buffer): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseCsv(csv: string): string[][] {
  return csv
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(",").map((v) => v.trim()));
}

function extractPlainText(doc: DocsDocument): string {
  const parts: string[] = [];
  const content = doc?.body?.content ?? [];

  for (const block of content) {
    const elements = block.paragraph?.elements ?? [];
    for (const el of elements) {
      const text = el.textRun?.content;
      if (typeof text === "string") parts.push(text);
    }
  }

  // o Docs usa \u000b (vertical tab) às vezes em quebras/formatos — normalize
  return parts.join("").replace(/\u000b/g, "\n");
}

export {
  getServiceAccountCredentials,
  parseToBase64Url,
  parseCsv,
  extractPlainText,
};
