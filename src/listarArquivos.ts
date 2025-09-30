import docgo from "docgo-sdk";
import { gapiGet } from "./utils";

interface ListarArquivosParams {
  q?: string;
  pageSize?: number;
}

async function listarArquivos(params: ListarArquivosParams): Promise<void> {
  try {
    const pageSize = params.pageSize ?? 20;
    const data = await gapiGet("/drive/v3/files", {
      q: params.q || "mimeType contains 'application/'",
      pageSize: String(pageSize),
      fields: "files(id,name,mimeType,owners,modifiedTime),nextPageToken",
    });
    console.log(docgo.result(true, data));
  } catch (err: any) {
    console.log(docgo.result(false, null, err.message));
  }
}

export default listarArquivos;
