import { createSign } from "crypto";
import { parseToBase64Url } from "../utils";

/**
 * Credenciais mínimas necessárias de um Service Account.
 *
 * Normalmente vêm do JSON baixado no Google Cloud Console.
 */
export interface ServiceAccountCredentials {
  /** E-mail do service account (ex: xxx@yyy.iam.gserviceaccount.com) */
  client_email: string;

  /** Chave privada PEM do service account (inclui "-----BEGIN PRIVATE KEY-----") */
  private_key: string;

  /** Endpoint OAuth para troca do JWT por access_token (ex: https://oauth2.googleapis.com/token) */
  token_uri: string;
}

/**
 * Tipo utilitário para querystring.
 * Ex.: { fields: "id,name", pageSize: "50" }
 */
export type Query = Record<string, string>;

/**
 * Cliente base para chamadas às APIs Google (Drive/Docs/Sheets).
 *
 * Exemplo de uso:
 * ```ts
 * const google = new GoogleApi(credentials);
 * const file = await google.get("https://www.googleapis.com", "/drive/v3/files/FILE_ID", { fields: "id,name" });
 * ```
 */
export class GoogleApi {
  private readonly creds: ServiceAccountCredentials;
  private readonly scopes: string;

  /**
   * Cache do token em memória (por instância).
   * - accessToken: token atual
   * - accessTokenExpiresAtMs: timestamp (ms) de expiração
   */
  private accessToken: string | null = null;
  private accessTokenExpiresAtMs = 0;

  /**
   * Cria uma instância do GoogleApi.
   *
   * @param credentials Credenciais mínimas do service account.
   * @param opts.scopes Scopes customizados (opcional). Se não fornecido, usa:
   *  - drive
   *  - documents
   *  - spreadsheets
   *
   * Observação:
   * - Scopes precisam bater com o que seu app faz. Se você só lê, dá pra trocar por:
   *   `.../drive.readonly`, `.../documents.readonly`, `.../spreadsheets.readonly`.
   */
  constructor(
    credentials: ServiceAccountCredentials,
    opts?: { scopes?: string[] }
  ) {
    if (
      !credentials?.client_email ||
      !credentials?.private_key ||
      !credentials?.token_uri
    ) {
      throw new Error(
        "Service account inválido: faltando client_email/private_key/token_uri"
      );
    }

    this.creds = credentials;

    this.scopes = (
      opts?.scopes?.length
        ? opts.scopes
        : [
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/documents",
            "https://www.googleapis.com/auth/spreadsheets",
          ]
    ).join(" ");
  }

  /**
   * Executa um GET.
   *
   * @param baseUrl Base da API (ex: https://www.googleapis.com | https://docs.googleapis.com | https://sheets.googleapis.com)
   * @param path Caminho (ex: /drive/v3/files)
   * @param query Querystring (opcional)
   */
  public async get<T = any>(
    baseUrl: string,
    path: string,
    query: Query = {}
  ): Promise<T> {
    return this.request<T>(baseUrl, path, { method: "GET", query });
  }

  /**
   * Executa um POST (JSON).
   *
   * @param body Objeto que será serializado com JSON.stringify
   */
  public async post<T = any>(
    baseUrl: string,
    path: string,
    body: any,
    query: Query = {}
  ): Promise<T> {
    return this.request<T>(baseUrl, path, { method: "POST", body, query });
  }

  /**
   * Executa um PUT (JSON).
   *
   * @param body Objeto que será serializado com JSON.stringify
   */
  public async put<T = any>(
    baseUrl: string,
    path: string,
    body: any,
    query: Query = {}
  ): Promise<T> {
    return this.request<T>(baseUrl, path, { method: "PUT", body, query });
  }

  /**
   * Executa um PATCH (JSON).
   *
   * @param body Objeto que será serializado com JSON.stringify
   */
  public async patch<T = any>(
    baseUrl: string,
    path: string,
    body: any,
    query: Query = {}
  ): Promise<T> {
    return this.request<T>(baseUrl, path, { method: "PATCH", body, query });
  }

  /**
   * Executa um DELETE.
   *
   * Observação:
   * - Para DELETE, este client retorna `undefined` (não tenta parsear JSON).
   */
  public async delete<T = any>(
    baseUrl: string,
    path: string,
    query: Query = {}
  ): Promise<T> {
    return this.request<T>(baseUrl, path, { method: "DELETE", query });
  }

  /**
   * Método base de request.
   *
   * Fluxo:
   * 1) Obtém access token via `getAccessToken()`.
   * 2) Monta URL (baseUrl + path + query).
   * 3) Envia fetch com Authorization Bearer.
   * 4) Se erro HTTP: lança Error com status e body de resposta.
   * 5) Se DELETE: retorna undefined.
   * 6) Caso contrário: faz `resp.json()`.
   *
   * @throws Error "Google API erro {status}: {body}"
   */
  private async request<T>(
    baseUrl: string,
    path: string,
    opts: {
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      query?: Query;
      body?: any;
    }
  ): Promise<T> {
    const token = await this.getAccessToken();

    const url = new URL(baseUrl + path);
    const query = opts.query ?? {};
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    let body: string | undefined;

    // Só envia body em métodos que aceitam payload (POST/PUT/PATCH).
    if (
      opts.method !== "GET" &&
      opts.method !== "DELETE" &&
      opts.body !== undefined
    ) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }

    const resp = await fetch(url.toString(), {
      method: opts.method,
      headers,
      body,
    } as any);

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Google API erro ${resp.status}: ${txt}`);
    }

    if (opts.method === "DELETE") return undefined as T;

    return (await resp.json()) as T;
  }

  /**
   * Gera o JWT (assertion) assinado com RS256 para OAuth 2.0 Service Account.
   *
   * Header:
   * - alg: RS256
   * - typ: JWT
   *
   * Payload:
   * - iss: client_email
   * - scope: string com scopes separados por espaço
   * - aud: token_uri
   * - iat: timestamp atual (segundos)
   * - exp: iat + 3600 (1h)
   *
   * Retorna:
   * - `${base64Url(header)}.${base64Url(payload)}.${base64Url(signature)}`
   */
  private createJwtAssertion(): string {
    const now = Math.floor(Date.now() / 1000);

    const header = parseToBase64Url(
      JSON.stringify({ alg: "RS256", typ: "JWT" })
    );

    const payload = parseToBase64Url(
      JSON.stringify({
        iss: this.creds.client_email,
        scope: this.scopes,
        aud: this.creds.token_uri,
        iat: now,
        exp: now + 3600,
      })
    );

    const signingInput = `${header}.${payload}`;

    const signer = createSign("RSA-SHA256");
    signer.update(signingInput);
    signer.end();

    const signature = parseToBase64Url(signer.sign(this.creds.private_key));

    return `${signingInput}.${signature}`;
  }

  /**
   * Obtém um access_token do Google via Service Account.
   *
   * Cache:
   * - Se `accessToken` ainda estiver válido por pelo menos 5 minutos, retorna do cache.
   * - Caso contrário, gera novo JWT assertion e faz POST em `token_uri`.
   *
   * Request:
   * - Content-Type: application/x-www-form-urlencoded
   * - grant_type: urn:ietf:params:oauth:grant-type:jwt-bearer
   * - assertion: JWT gerado por `createJwtAssertion()`
   *
   * Response esperado:
   * - access_token: string
   * - expires_in: number (segundos) (opcional)
   *
   * @throws Error "Erro ao obter access token: {status} - {body}"
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // margem de 5 minutos para evitar expirar durante o uso
    if (this.accessToken && this.accessTokenExpiresAtMs > now + 5 * 60 * 1000) {
      return this.accessToken;
    }

    const assertion = this.createJwtAssertion();

    const resp = await fetch(this.creds.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:
        "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" +
        `&assertion=${encodeURIComponent(assertion)}`,
    } as any);

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Erro ao obter access token: ${resp.status} - ${txt}`);
    }

    const data = await resp.json();

    this.accessToken = data.access_token;

    const expiresInSec = data.expires_in ?? 3600;
    this.accessTokenExpiresAtMs = now + expiresInSec * 1000;

    return this.accessToken!;
  }
}
