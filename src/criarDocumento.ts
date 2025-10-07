import docgo from "docgo-sdk";
import { gapiPost } from "./utils";

interface CriarDocumentoParams {
  titulo: string;
  content?: string;
}

async function criarDocumento(params: CriarDocumentoParams): Promise<void> {
  if (Array.isArray(params) && params.length === 1 && typeof params[0] === 'object') {
    params = params[0];
  }
  try {
    if (!params.titulo) {
      console.log(docgo.result(false, null, "titulo é obrigatório"));
      return;
    }
    const body = { title: params.titulo } as any;
    const data = await gapiPost("/v1/documents", body);
    if (params.content) {
      const newData = await gapiPost(
        `/v1/documents/${encodeURIComponent(data.documentId)}:batchUpdate`,
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
      data.updates = newData;
    }
    console.log(docgo.result(true, data));
  } catch (err: any) {
    console.log(docgo.result(false, null, err.message));
  }
}

export default criarDocumento;
