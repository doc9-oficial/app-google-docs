import docgo from "docgo-sdk";

import { getServiceAccountCredentials } from "./utils";
import { GoogleApi } from "./google/google";
import { GoogleSheetsApi } from "./google/sheets";
import { GoogleDocsApi } from "./google/docs";
import { GoogleDriveApi } from "./google/drive";

interface AtualizarArquivoParams {
  documentId?: string;
  content: string;
}

async function atualizarDocumento(
  params: AtualizarArquivoParams
): Promise<void> {
  try {
    if (
      Array.isArray(params) &&
      params.length === 1 &&
      typeof params[0] === "object"
    ) {
      params = params[0] as any;
    }

    const documentId = params?.documentId;

    if (!documentId) {
      console.log(docgo.result(false, null, "documentId é obrigatório"));
      return;
    }

    if (!params?.content) {
      console.log(docgo.result(false, null, "content é obrigatório"));
      return;
    }

    const credentials = getServiceAccountCredentials();
    if (!credentials) {
      console.log(docgo.result(false, null, "credencial é obrigatório"));
      return;
    }

    const google = new GoogleApi(credentials);
    const docs = new GoogleDocsApi(google);
    const drive = new GoogleDriveApi(google);

    const meta = await drive.getById(documentId);

    if (!meta?.mimeType) {
      console.log(
        docgo.result(
          false,
          null,
          "não foi possível identificar o arquivo informado"
        )
      );
      return;
    }

    const result = await docs.updateById(documentId, params.content);
    console.log(
      docgo.result(true, { kind: "google-docs", file: meta, updates: result })
    );
    return;
  } catch (err: any) {
    console.log(docgo.result(false, null, err?.message ?? String(err)));
  }
}

export default atualizarDocumento;
