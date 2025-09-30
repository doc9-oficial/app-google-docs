import docgo from "docgo-sdk";
import { gapiGet } from "./utils";

interface LerDocumentoParams {
  documentId: string;
}

async function lerDocumento(params: LerDocumentoParams): Promise<void> {
  try {
    if (!params.documentId) {
      console.log(docgo.result(false, null, "documentId é obrigatório"));
      return;
    }
    const data = await gapiGet(
      `/docs/v1/documents/${encodeURIComponent(params.documentId)}`
    );
    console.log(docgo.result(true, data));
  } catch (err: any) {
    console.log(docgo.result(false, null, err.message));
  }
}

export default lerDocumento;
