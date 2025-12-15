import docgo from "docgo-sdk";
import { getServiceAccountCredentials } from "./utils";

import { GoogleApi } from "./google/google";
import { GoogleDriveApi } from "./google/drive";

interface ListarArquivosParams {
  q?: string;
  pageSize?: number;
  pageToken?: string;
}

async function listarArquivos(params: ListarArquivosParams): Promise<void> {
  try {
    if (
      Array.isArray(params) &&
      params.length === 1 &&
      typeof params[0] === "object"
    ) {
      params = params[0] as any;
    }

    const credentials = getServiceAccountCredentials();

    if (!credentials) {
      console.log(
        docgo.result(
          false,
          null,
          "é necessário informar credenciais google para utilizar este app"
        )
      );
      return;
    }

    const google = new GoogleApi(credentials);
    const drive = new GoogleDriveApi(google);

    const result = await drive.getAll({
      q: params?.q ?? "trashed=false",
      pageSize: params?.pageSize ?? 50,
      pageToken: params?.pageToken,
      fields:
        "nextPageToken,files(id,name,mimeType,parents,modifiedTime,createdTime,webViewLink)",
      orderBy: "modifiedTime desc",
    });

    console.log(docgo.result(true, result));
  } catch (err: any) {
    console.log(docgo.result(false, null, err?.message ?? String(err)));
  }
}

export default listarArquivos;
