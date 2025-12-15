import docgo from "docgo-sdk";

import { getServiceAccountCredentials, parseCsv } from "./utils";
import { GoogleApi } from "./google/google";
import { GoogleDriveApi } from "./google/drive";
import { GoogleSheetsApi } from "./google/sheets";
import { CreateFileParams } from "./types";

async function criarPlanilha(params: CreateFileParams): Promise<void> {
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
    const sheets = new GoogleSheetsApi(google);

    const created = await drive.create({
      name: params.titulo,
      mimeType: "application/vnd.google-apps.spreadsheet",
    });

    const fileId = created?.id;
    if (!fileId) {
      console.log(
        docgo.result(false, null, "não foi possível criar a planilha")
      );
      return;
    }

    let updates: any = null;

    // Se for planilha + vier CSV, preenche a partir de A1
    if (params.content && params.content.trim().length > 0) {
      const values = parseCsv(params.content);

      // range A1 suficiente (Sheets expande automaticamente)
      updates = await sheets.valuesUpdate(fileId, "A1", values);
    }

    console.log(
      docgo.result(true, {
        id: fileId,
        fileId,
        title: params.titulo,
        created,
        updates,
      })
    );
  } catch (err: any) {
    console.log(docgo.result(false, null, err?.message ?? String(err)));
  }
}

export default criarPlanilha;
