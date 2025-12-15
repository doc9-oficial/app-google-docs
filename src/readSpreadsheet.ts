import docgo from "docgo-sdk";

import { getServiceAccountCredentials } from "./utils";
import { GoogleApi } from "./google/google";
import { GoogleSheetsApi } from "./google/sheets";

interface LerArquivoParams {
  sheetId: string;
  range?: string;
}

async function lerArquivo(params: LerArquivoParams): Promise<void> {
  try {
    if (
      Array.isArray(params) &&
      params.length === 1 &&
      typeof params[0] === "object"
    ) {
      params = params[0] as any;
    }

    if (!params?.sheetId) {
      console.log(docgo.result(false, null, "sheetId é obrigatório"));
      return;
    }

    const credentials = getServiceAccountCredentials();

    if (!credentials) {
      console.log(docgo.result(false, null, "credencial é obrigatório"));
      return;
    }

    const google = new GoogleApi(credentials);
    const sheets = new GoogleSheetsApi(google);

    const result = await sheets.getValues(params.sheetId, params.range);

    console.log(docgo.result(true, result));
  } catch (err: any) {
    console.log(docgo.result(false, null, err?.message ?? String(err)));
  }
}

export default lerArquivo;
