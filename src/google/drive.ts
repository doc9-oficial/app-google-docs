import { GoogleApi, Query } from "./google";

export type DriveListParams = {
  pageSize?: number;
  pageToken?: string;
  q?: string;
  fields?: string;
  orderBy?: string;
};

export interface DriveFile {
  id: string;
  name?: string;
  mimeType?: string;
  parents?: string[];
  modifiedTime?: string; // RFC3339
  createdTime?: string; // RFC3339
  webViewLink?: string;
  size?: string;
  owners?: {
    displayName?: string;
    emailAddress?: string;
    me?: boolean;
  }[];
}

export class GoogleDriveApi {
  private readonly google: GoogleApi;

  constructor(googleApi: GoogleApi) {
    this.google = googleApi;
  }

  /**
   * GET /drive/v3/files/{fileId}
   * Retorna metadados do arquivo.
   */
  async getById(
    fileId: string,
    fields = "id,name,mimeType,parents,modifiedTime,createdTime,webViewLink"
  ): Promise<DriveFile> {
    return this.google.get(
      "https://www.googleapis.com",
      `/drive/v3/files/${encodeURIComponent(fileId)}`,
      { fields }
    );
  }

  /**
   * GET /drive/v3/files
   * Lista arquivos (você controla via q/pageSize/pageToken).
   */
  async getAll(
    params: DriveListParams = {}
  ): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
    const {
      q,
      pageSize = 50,
      pageToken,
      fields = "nextPageToken,files(id,name,mimeType)",
      orderBy = "modifiedTime desc",
    } = params;

    const query: Query = {
      pageSize: String(pageSize),
      fields,
      orderBy,
    };

    if (q) query.q = q;
    if (pageToken) query.pageToken = pageToken;

    return this.google.get(
      "https://www.googleapis.com",
      "/drive/v3/files",
      query
    );
  }

  /**
   * PATCH /drive/v3/files/{fileId}
   * Atualiza metadados (ex: name, description, starred, etc.)
   *
   * OBS: para mover pasta/parents, também é via update, mas usando addParents/removeParents.
   */
  async updateById(
    fileId: string,
    body: any,
    params?: { fields?: string; addParents?: string; removeParents?: string }
  ): Promise<any> {
    const query: Query = {};
    if (params?.fields) query.fields = params.fields;
    if (params?.addParents) query.addParents = params.addParents;
    if (params?.removeParents) query.removeParents = params.removeParents;

    return this.google.patch(
      "https://www.googleapis.com",
      `/drive/v3/files/${encodeURIComponent(fileId)}`,
      body,
      query
    );
  }

  /**
   * DELETE /drive/v3/files/{fileId}
   */
  async deleteById(fileId: string): Promise<void> {
    await this.google.delete(
      "https://www.googleapis.com",
      `/drive/v3/files/${encodeURIComponent(fileId)}`
    );
  }

  /**
   * POST /drive/v3/files
   * Cria arquivo (Google Doc, Sheet, pasta, etc.)
   */
  async create(
    body: { name: string; mimeType: string; parents?: string[] },
    fields = "id,name,mimeType"
  ): Promise<any> {
    return this.google.post(
      "https://www.googleapis.com",
      "/drive/v3/files",
      body,
      { fields, supportsAllDrives: "true" }
    );
  }
}
