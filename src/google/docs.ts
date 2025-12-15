import { GoogleApi } from "./google";

/**
 * Cliente especializado para operações no Google Docs.
 *
 * Esta classe depende de um `GoogleApi` (Service Account) para:
 * - obter token OAuth
 * - realizar requests HTTP (GET/POST)
 * - aplicar tratamento genérico de erros
 *
 * Responsabilidade:
 * - encapsular endpoints da API do Google Docs
 * - fornecer métodos de leitura e atualização do conteúdo do documento
 *
 * Observações importantes sobre a Docs API:
 * - O conteúdo do documento é estruturado e endereçado por índices (`startIndex` / `endIndex`).
 * - Não existe "endIndex infinito". Para apagar o conteúdo, é necessário descobrir
 *   o último `endIndex` existente no body do documento.
 * - Este módulo atualiza apenas o BODY do documento (não trata header/footer, tabelas complexas etc.).
 */
export class GoogleDocsApi {
  private readonly google: GoogleApi;

  /**
   * @param googleApi Instância do GoogleApi já configurada com credenciais (Service Account).
   */
  constructor(googleApi: GoogleApi) {
    this.google = googleApi;
  }

  /**
   * GET /v1/documents/{documentId}
   *
   * Obtém a estrutura completa de um documento do Google Docs, incluindo:
   * - `body.content` (parágrafos, quebras, elementos)
   * - estilos e metadados
   *
   * @param documentId ID do documento do Google Docs (normalmente o fileId no Drive).
   * @returns Payload completo do documento conforme a Google Docs API.
   *
   * @see https://developers.google.com/docs/api/reference/rest/v1/documents/get
   */
  async getById(documentId: string): Promise<any> {
    return this.google.get(
      "https://docs.googleapis.com",
      `/v1/documents/${encodeURIComponent(documentId)}`
    );
  }

  /**
   * Atualiza o conteúdo do documento substituindo TODO o conteúdo do BODY.
   *
   * Implementação:
   * 1) Busca o documento para descobrir o último `endIndex` do `body.content`.
   * 2) Remove o conteúdo do intervalo [1, endIndex-1] com `deleteContentRange`.
   * 3) Insere o novo texto a partir do índice 1 com `insertText`.
   *
   * Por que isso é necessário:
   * - A Google Docs API trabalha com índices finitos e exige `endIndex` real.
   * - Não é possível deletar até "Infinity" / "fim" sem calcular o índice final.
   *
   * Comportamento:
   * - Remove o conteúdo do body e insere `data`.
   * - Preserva estrutura externa fora do body (ex.: properties do doc),
   *   mas não é um "reset total" de headers/footers/tabelas especiais (se existirem).
   *
   * @param documentId ID do documento do Google Docs.
   * @param data Texto que será inserido como novo conteúdo do documento.
   * @returns Resposta do endpoint `documents.batchUpdate`.
   *
   * @see https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
   */
  async updateById(documentId: string, data: string): Promise<any> {
    // Busca o doc para calcular o range real do body
    const doc = await this.getById(documentId);

    const content = doc.body?.content ?? [];
    const last = content[content.length - 1];

    // `endIndex` do último elemento normalmente representa o "fim" do body
    const endIndex = typeof last?.endIndex === "number" ? last.endIndex : 1;

    // range de deleção: [1, endIndex-1]
    // (endIndex é exclusivo, e existe um "fim" lógico que não deve ser deletado diretamente)
    const deleteEnd = Math.max(1, endIndex - 1);

    const requests = [
      // Apaga o conteúdo existente do body (se houver)
      ...(deleteEnd > 1
        ? [
            {
              deleteContentRange: {
                range: {
                  startIndex: 1,
                  endIndex: deleteEnd,
                },
              },
            },
          ]
        : []),

      // Insere o novo texto no início do body
      {
        insertText: {
          location: { index: 1 },
          text: data,
        },
      },
    ];

    return this.google.post(
      "https://docs.googleapis.com",
      `/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      { requests }
    );
  }
}
