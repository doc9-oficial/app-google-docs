import docgo from "docgo-sdk";

import { getServiceAccountCredentials } from "./utils";
import { GoogleApi } from "./google/google";
import { GoogleDriveApi } from "./google/drive";
import { CreateFileParams } from "./types";

async function criarDocumento(params: CreateFileParams): Promise<void> {
  try {
    if (
      Array.isArray(params) &&
      params.length === 1 &&
      typeof params[0] === "object"
    ) {
      params = params[0] as any;
    }

    if (!params?.titulo) {
      console.log(docgo.result(false, null, "titulo é obrigatório"));
      return;
    }

    const credentials = getServiceAccountCredentials();
    if (!credentials) {
      console.log(docgo.result(false, null, "credencial é obrigatório"));
      return;
    }

    const google = new GoogleApi(credentials);
    const drive = new GoogleDriveApi(google);

    const created = await drive.create({
      name: params.titulo,
      mimeType: "application/vnd.google-apps.document",
      parents: [params.sharedDriveId],
    });

    const documentId = created?.id;
    if (!documentId) {
      console.log(
        docgo.result(false, null, "não foi possível criar o documento")
      );
      return;
    }

    console.log(
      docgo.result(true, {
        id: documentId,
        documentId,
        title: params.titulo,
        created,
      })
    );
  } catch (err: any) {
    console.log(docgo.result(false, null, err?.message ?? String(err)));
  }
}

export default criarDocumento;
