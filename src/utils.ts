import docgo from "docgo-sdk";

export function getGoogleAccessToken(): string | null {
  return (
    docgo.getEnv("GOOGLE_ACCESS_TOKEN") ||
    docgo.getEnv("DOCGO_GOOGLE_ACCESS_TOKEN") ||
    docgo.getEnv("googleAccessToken") ||
    docgo.getEnv("docgoGoogleAccessToken") ||
    null
  );
}

export function getGoogleAPIBase(): string {
  return (
    docgo.getEnv("GOOGLE_API_BASE") || "https://docs.googleapis.com"
  ).replace(/\/$/, "");
}

export async function gapiGet(
  path: string,
  query: Record<string, string> = {}
) {
  const token = getGoogleAccessToken();
  if (!token) docgo.result(false, null, "Google access token não configurado");
  
  const base = getGoogleAPIBase();
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  } as any);
  
  if (!resp.ok) throw new Error(`Google API erro ${resp.status}`);
  return resp.json();
}

export async function gapiPost(
  path: string,
  body: any,
  query: Record<string, string> = {}
) {
  const token = getGoogleAccessToken();
  if (!token) throw new Error("Google access token não configurado");
  const base = getGoogleAPIBase();
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  } as any);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Google API erro ${resp.status}: ${txt}`);
  }
  return resp.json();
}
