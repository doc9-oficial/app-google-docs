import docgo from "docgo-sdk";

import { extractPlainText, getServiceAccountCredentials } from "./utils";
import { GoogleApi } from "./google/google";
import { GoogleDocsApi } from "./google/docs";

interface LerArquivoParams {
  documentId: string;
  mode?: "ONLY_TEXT" | "PARAGRAPH_TREE";
}

async function lerArquivo(params: LerArquivoParams): Promise<void> {
  try {
    if (
      Array.isArray(params) &&
      params.length === 1 &&
      typeof params[0] === "object"
    ) {
      params = params[0] as any;
    }

    if (!params?.documentId) {
      console.log(docgo.result(false, null, "documentId é obrigatório"));
      return;
    }

    const credentials = getServiceAccountCredentials();

    if (!credentials) {
      console.log(docgo.result(false, null, "credencial é obrigatório"));
      return;
    }

    const google = new GoogleApi(credentials);
    const docs = new GoogleDocsApi(google);

    const result = await docs.getById(params.documentId);
    if (params.mode === "PARAGRAPH_TREE") {
      console.log(docgo.result(true, result));
      return;
    }

    const parsed = extractPlainText(result);
    console.log(docgo.result(true, parsed));
  } catch (err: any) {
    console.log(docgo.result(false, null, err?.message ?? String(err)));
  }
}

export default lerArquivo;
