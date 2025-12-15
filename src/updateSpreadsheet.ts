import docgo from "docgo-sdk";

import { getServiceAccountCredentials, parseCsv } from "./utils";
import { GoogleApi } from "./google/google";
import { GoogleSheetsApi } from "./google/sheets";
import { GoogleDriveApi } from "./google/drive";

interface Params {
  sheetId?: string;
  content: string;

  // para usar em spredsheet
  range?: string;
}

async function atualizarPlanilha(params: Params): Promise<void> {
  try {
    if (
      Array.isArray(params) &&
      params.length === 1 &&
      typeof params[0] === "object"
    ) {
      params = params[0] as any;
    }

    const sheetId = params?.sheetId;

    if (!sheetId) {
      console.log(docgo.result(false, null, "sheetId é obrigatório"));
      return;
    }

    if (!params?.content) {
      console.log(docgo.result(false, null, "content é obrigatório"));
      return;
    }

    const credentials = getServiceAccountCredentials();
    if (!credentials) {
      console.log(docgo.result(false, null, "credencial é obrigatório"));
      return;
    }

    const google = new GoogleApi(credentials);
    const sheets = new GoogleSheetsApi(google);
    const drive = new GoogleDriveApi(google);

    const meta = await drive.getById(sheetId);
    if (!meta?.mimeType) {
      console.log(
        docgo.result(
          false,
          null,
          "não foi possível identificar o arquivo informado"
        )
      );
      return;
    }

    if (meta.mimeType !== "application/vnd.google-apps.spreadsheet") {
      console.log(
        docgo.result(
          false,
          { file: meta },
          "o arquivo informado não é uma planilha do Google Sheets"
        )
      );
      return;
    }

    const rangeA1 = params.range ?? "A1";

    const values = parseCsv(params.content);
    const updates = await sheets.valuesUpdate(sheetId, rangeA1, values);

    console.log(
      docgo.result(true, {
        kind: "google-sheets",
        file: meta,
        range: rangeA1,
        updates,
      })
    );
  } catch (err: any) {
    console.log(docgo.result(false, null, err?.message ?? String(err)));
  }
}

export default atualizarPlanilha;
