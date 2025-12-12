import docgo from "docgo-sdk";
import { gapiPost, getGoogleAccessToken } from "./utils";

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
    
    // Criar documento via Drive API ao invés de Docs API
    // Isso permite especificar uma pasta e evita problemas de quota
    const token = await getGoogleAccessToken();
    const createBody: any = {
      name: params.titulo,
      mimeType: 'application/vnd.google-apps.document'
    };
    
    const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createBody)
    } as any);
    
    if (!createResp.ok) {
      const errorText = await createResp.text();
      throw new Error(`Erro ao criar documento: ${createResp.status} - ${errorText}`);
    }
    
    const data = await createResp.json();
    
    // Se houver conteúdo, adiciona via Docs API
    if (params.content) {
      const newData = await gapiPost(
        `/v1/documents/${encodeURIComponent(data.id)}:batchUpdate`,
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
    
    // Retorna com documentId para compatibilidade
    data.documentId = data.id;
    console.log(docgo.result(true, data));
  } catch (err: any) {
    console.log(docgo.result(false, null, err.message));
  }
}

export default criarDocumento;
