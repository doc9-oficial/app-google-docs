import { GoogleApi } from "./google";

/**
 * Representa um range de uma célula (única) já convertido para o formato exigido
 * pelo `spreadsheets.batchUpdate` (índices base-0) e também preserva a notação A1.
 *
 * - `sheetId`: identificador numérico da aba alvo
 * - `startRowIndex/endRowIndex`: intervalo de linhas (end é exclusivo)
 * - `startColumnIndex/endColumnIndex`: intervalo de colunas (end é exclusivo)
 * - `a1`: range original normalizado (ex.: "Sheet1!B2" ou "A1")
 */
type A1Target = {
  sheetId: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
  a1: string;
};

/**
 * Cliente especializado para operações no Google Sheets.
 *
 * Esta classe depende de um `GoogleApi` (Service Account) para:
 * - obter token OAuth
 * - realizar requests HTTP (GET/POST/PUT)
 * - aplicar tratamento genérico de erros
 *
 * Responsabilidade:
 * - encapsular endpoints da API do Google Sheets
 * - fornecer utilitários para lidar com ranges A1 (ex.: "A1", "AA10", "Aba!B2")
 *
 * Principais operações:
 * - `getById`: obtém metadados/estrutura de uma planilha
 * - `updateById`: atualiza o valor de UMA célula usando batchUpdate (ex.: "B2")
 * - `valuesUpdate`: atualiza valores tabulares (matriz) em um range A1 via values.update
 */
export class GoogleSheetsApi {
  private readonly google: GoogleApi;

  /**
   * @param googleApi Instância do GoogleApi já configurada com credenciais (Service Account).
   */
  constructor(googleApi: GoogleApi) {
    this.google = googleApi;
  }

  /**
   * GET /v4/spreadsheets/{spreadsheetId}
   *
   * Retorna a estrutura completa da planilha: abas (sheets), propriedades,
   * dimensões, etc.
   *
   * @param spreadsheetId ID do Google Sheets (fileId no Drive).
   * @returns Payload completo do spreadsheet (estrutura do Sheets API).
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
   */
  async getById(spreadsheetId: string): Promise<any> {
    return this.google.get(
      "https://sheets.googleapis.com",
      `/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`
    );
  }

  /**
   * Atualiza o conteúdo de UMA célula específica da planilha.
   *
   * Implementação via `spreadsheets.batchUpdate` com `updateCells`, que trabalha com:
   * - `sheetId` (aba alvo)
   * - índices de linha/coluna base-0 (end exclusivo)
   *
   * O parâmetro `range` aceita:
   * - "A1", "B2", "AA10" (célula única)
   * - "Sheet1!B2" (aba explícita)
   * - "'Minha Aba'!C3" (aba com espaços, usando aspas simples)
   *
   * Regras:
   * - Se nenhuma aba for informada, usa a PRIMEIRA aba do spreadsheet.
   * - `data` é escrito como `stringValue`. (Se quiser number/bool, ajuste userEnteredValue.)
   *
   * @param spreadsheetId ID da planilha (Google Sheets).
   * @param data Texto a ser gravado na célula alvo.
   * @param range Range no formato A1 (padrão: "A1").
   * @returns Resposta do batchUpdate do Sheets API.
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
   */
  async updateById(
    spreadsheetId: string,
    data: string,
    range: string = "A1"
  ): Promise<any> {
    const spreadsheet = await this.getById(spreadsheetId);

    const target = this.resolveA1Target(spreadsheet, range);

    const requests = [
      {
        updateCells: {
          range: {
            sheetId: target.sheetId,
            startRowIndex: target.startRowIndex,
            endRowIndex: target.endRowIndex,
            startColumnIndex: target.startColumnIndex,
            endColumnIndex: target.endColumnIndex,
          },
          rows: [
            {
              values: [
                {
                  userEnteredValue: { stringValue: data },
                },
              ],
            },
          ],
          fields: "userEnteredValue",
        },
      },
    ];

    return this.google.post(
      "https://sheets.googleapis.com",
      `/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      { requests }
    );
  }

  /**
   * Atualiza valores tabulares (matriz) em um range A1 usando `spreadsheets.values.update`.
   *
   * Esta é a forma mais simples para preencher planilhas com tabelas (ex.: CSV),
   * já que trabalha direto com `values` (linhas e colunas), sem precisar calcular `sheetId`
   * nem índices base-0.
   *
   * Características:
   * - `majorDimension: "ROWS"`: cada array interno representa uma linha.
   * - `valueInputOption: "USER_ENTERED"`: interpreta valores como se fossem digitados
   *   pelo usuário (suporta números, datas e fórmulas).
   * - O intervalo pode crescer automaticamente para acomodar a matriz.
   *
   * @param spreadsheetId ID da planilha.
   * @param rangeA1 Range no formato A1 (ex.: "A1", "Sheet1!A1:D20").
   * @param values Matriz de valores (linhas x colunas).
   * @returns Resposta do endpoint values.update.
   *
   * @example
   * await sheets.valuesUpdate(spreadsheetId, "A1", [
   *   ["Nome", "Idade"],
   *   ["José", 28],
   * ]);
   *
   * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
   */
  async valuesUpdate(
    spreadsheetId: string,
    rangeA1: string,
    values: (string | number | boolean)[][]
  ) {
    return this.google.put(
      "https://sheets.googleapis.com",
      `/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(rangeA1)}`,
      { values, majorDimension: "ROWS" },
      { valueInputOption: "USER_ENTERED" }
    );
  }

  /**
   * GET /v4/spreadsheets/{spreadsheetId}/values/{range}
   * Retorna os valores (conteúdo) de um range em notação A1.
   */
  async getValues(
    spreadsheetId: string,
    rangeA1: string = "A1:Z1000",
    params?: {
      valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";
      dateTimeRenderOption?: "SERIAL_NUMBER" | "FORMATTED_STRING";
    }
  ): Promise<any> {
    const query: Record<string, string> = {};
    if (params?.valueRenderOption)
      query.valueRenderOption = params.valueRenderOption;
    if (params?.dateTimeRenderOption)
      query.dateTimeRenderOption = params.dateTimeRenderOption;

    return this.google.get(
      "https://sheets.googleapis.com",
      `/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(rangeA1)}`,
      query
    );
  }

  /**
   * Converte um range A1 de célula única (ex.: "A1", "AA10", "Sheet1!B2")
   * em um `A1Target` com índices base-0 para uso no `updateCells`.
   *
   * Regras:
   * - Se `inputRange` incluir "!", tenta resolver a aba pelo `title`.
   * - Se não incluir "!", usa a primeira aba do spreadsheet.
   * - Suporta aba entre aspas simples, ex.: "'Minha Aba'!A1"
   * - Aceita apenas célula única (não suporta "A1:D10" aqui).
   *
   * @param spreadsheet Payload retornado por `getById`.
   * @param inputRange Range A1 informado pelo usuário.
   * @returns Estrutura normalizada com sheetId e índices base-0.
   */
  private resolveA1Target(spreadsheet: any, inputRange: string): A1Target {
    const sheets = spreadsheet?.sheets ?? [];
    if (!Array.isArray(sheets) || sheets.length === 0) {
      throw new Error("Planilha não possui abas (sheets) para atualizar.");
    }

    const normalized = String(inputRange || "A1").trim();

    // aceita "SheetName!A1" ou só "A1"
    let sheetName: string | null = null;
    let cellRef = normalized;

    const bangIdx = normalized.indexOf("!");
    if (bangIdx !== -1) {
      sheetName = normalized.slice(0, bangIdx).trim();
      cellRef = normalized.slice(bangIdx + 1).trim();

      // remove aspas simples caso venha "'Minha Aba'!A1"
      if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
        sheetName = sheetName.slice(1, -1);
      }
    }

    const sheet = sheetName
      ? sheets.find((s: any) => s?.properties?.title === sheetName)
      : sheets[0];

    const sheetId = sheet?.properties?.sheetId;
    if (typeof sheetId !== "number") {
      throw new Error("Não foi possível identificar o sheetId da aba alvo.");
    }

    // célula única: letras + números (A1, B2, AA10)
    const m = /^([A-Za-z]+)(\d+)$/.exec(cellRef);
    if (!m) {
      throw new Error(
        `Range inválido: "${inputRange}". Use "A1", "B2", "AA10" ou "Aba!B2".`
      );
    }

    const colLetters = m[1].toUpperCase();
    const rowNumber = parseInt(m[2], 10);

    if (!Number.isFinite(rowNumber) || rowNumber <= 0) {
      throw new Error(`Linha inválida em range: "${inputRange}".`);
    }

    const colIndex = this.columnLettersToIndex(colLetters);
    const rowIndex = rowNumber - 1;

    return {
      sheetId,
      startRowIndex: rowIndex,
      endRowIndex: rowIndex + 1,
      startColumnIndex: colIndex,
      endColumnIndex: colIndex + 1,
      a1: `${sheetName ? `${sheetName}!` : ""}${colLetters}${rowNumber}`,
    };
  }

  /**
   * Converte letras de coluna (A, B, Z, AA, AB...) para índice base-0.
   *
   * Exemplos:
   * - A  -> 0
   * - B  -> 1
   * - Z  -> 25
   * - AA -> 26
   * - AB -> 27
   *
   * @param letters Letras da coluna em maiúsculo (A-Z).
   * @returns Índice base-0 da coluna.
   */
  private columnLettersToIndex(letters: string): number {
    let n = 0;
    for (let i = 0; i < letters.length; i++) {
      const code = letters.charCodeAt(i);
      if (code < 65 || code > 90) {
        throw new Error(`Coluna inválida: "${letters}"`);
      }
      n = n * 26 + (code - 64);
    }
    return n - 1;
  }
}
