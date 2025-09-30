import docgo from "docgo-sdk";
import { gapiPost } from "./utils";

interface CriarDocumentoParams {
  titulo: string;
}

async function criarDocumento(params: CriarDocumentoParams): Promise<void> {
  if (Array.isArray(params) && typeof params[0] === "string") {
    params = JSON.parse(params[0]);
  }
  try {
    if (!params.titulo) {
      console.log(docgo.result(false, null, "titulo é obrigatório"));
      return;
    }
    const body = { title: params.titulo } as any;
    const data = await gapiPost("/docs/v1/documents", body);
    console.log(docgo.result(true, data));
  } catch (err: any) {
    console.log(docgo.result(false, null, err.message));
  }
}

export default criarDocumento;
