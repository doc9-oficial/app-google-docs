# App gdocs

Integração DocGo para manipulação de documentos Google Docs.

## 📄 Funcionalidades

- **criarDocumento**: Cria um novo documento no Google Docs.
- **lerDocumento**: Lê o conteúdo de um documento existente.
- **listarArquivos**: Lista arquivos do Google Drive acessíveis.
- **utils**: Funções utilitárias internas.

## 🚀 Como usar

### Pré-requisitos

- Configurar variáveis de ambiente com as credenciais da API Google (OAuth2 ou Service Account).
- Ter permissões de acesso ao Google Drive/Docs.

### Variáveis de Ambiente

No arquivo `.env`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_SERVICE_ACCOUNT_JSON=... # (opcional, para Service Account)
```

### Exemplos de uso

Criar documento:
```bash
./docgo gdocs criarDocumento '{"titulo":"Meu Doc","conteudo":"Olá, mundo!"}'
```

Ler documento:
```bash
./docgo gdocs lerDocumento "ID_DO_DOCUMENTO"
```

Listar arquivos:
```bash
./docgo gdocs listarArquivos
```

## 🛠️ Build

```bash
npm install
npm run build
```

## 📁 Estrutura

```
gdocs/
  build.sh
  manifest.json
  package.json
  tsconfig.json
  src/
    criarDocumento.ts
    lerDocumento.ts
    listarArquivos.ts
    utils.ts
```

## 📝 Observações

- O app utiliza o DocGo SDK para integração e autenticação.
- Consulte a documentação do Google para gerar credenciais OAuth2 ou Service Account.
- Os comandos podem variar conforme a configuração do seu ambiente DocGo.

## 📄 Licença

MIT