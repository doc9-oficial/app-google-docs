import docgo from "docgo-sdk";
import { createSign } from "crypto";

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

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

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function createJWT(serviceAccount: ServiceAccount, scope: string): string {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  
  const payload = {
    iss: serviceAccount.client_email,
    scope: scope,
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const sign = createSign("RSA-SHA256");
  sign.update(signatureInput);
  sign.end();
  
  const signature = sign.sign(serviceAccount.private_key);
  const encodedSignature = signature
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  
  return `${signatureInput}.${encodedSignature}`;
}

async function getAccessTokenFromServiceAccount(): Promise<string> {
  const serviceAccount = getServiceAccountCredentials();
  
  if (!serviceAccount) {
    throw new Error("Service account não configurado");
  }
  
  const scope = "https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive";
  const jwt = createJWT(serviceAccount, scope);
  
  const response = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  } as any);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao obter access token: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getGoogleAccessToken(): Promise<string> {
  const now = Date.now();
  
  // Retorna token em cache se ainda válido (com 5 min de margem)
  if (cachedToken && tokenExpiry > now + 5 * 60 * 1000) {
    return cachedToken;
  }
  
  // Gera novo token
  cachedToken = await getAccessTokenFromServiceAccount();
  tokenExpiry = now + 3600 * 1000; // Token válido por 1 hora
  
  return cachedToken;
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
  const token = await getGoogleAccessToken();
  if (!token) throw new Error("Google access token não configurado");
  
  const base = path.startsWith('/drive') 
    ? 'https://www.googleapis.com'
    : getGoogleAPIBase();
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  } as any);
  
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Google API erro ${resp.status}: ${errorText}`);
  }
  return resp.json();
}

export async function gapiPost(
  path: string,
  body: any,
  query: Record<string, string> = {}
) {
  const token = await getGoogleAccessToken();
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
