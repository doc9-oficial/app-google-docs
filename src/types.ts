export type DocumentMimeType =
  | "application/vnd.google-apps.document"
  | "application/vnd.google-apps.spreadsheet";

export type DocsDocument = {
  body?: {
    content?: Array<{
      paragraph?: {
        elements?: Array<{
          textRun?: { content?: string };
        }>;
      };
    }>;
  };
};

export interface ServiceAccount {
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

export interface CreateFileParams {
  sharedDriveId: string;
  titulo: string;
  content?: string;
}
