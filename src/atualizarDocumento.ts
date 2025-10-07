import docgo from "docgo-sdk";
import { gapiPost } from "./utils";

interface AtualizarDocumentoParams {
  documentId: string;
  content: string;
}

async function atualizarDocumento(
  params: AtualizarDocumentoParams
): Promise<void> {
  if (Array.isArray(params) && params.length === 1 && typeof params[0] === 'object') {
    params = params[0];
  }
  try {
    if (!params.documentId) {
      console.log(docgo.result(false, null, "documentId é obrigatório"));
      return;
    }
    if (!params.content) {
      console.log(docgo.result(false, null, "content é obrigatório"));
      return;
    }
    const data = await gapiPost(
      `/v1/documents/${encodeURIComponent(params.documentId)}:batchUpdate`,
      {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: params.content,
            },
          },
        ],
      }
    );
    console.log(docgo.result(true, data));
  } catch (err: any) {
    console.log(docgo.result(false, null, err.message));
  }
}

export default atualizarDocumento;