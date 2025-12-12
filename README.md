# App gdocs

Integração DocGo para manipulação de documentos Google Docs.

## 📄 Funcionalidades

- **lerDocumento**: Lê o conteúdo de documentos compartilhados.
- **atualizarDocumento**: Atualiza o conteúdo de documentos compartilhados.
- **listarArquivos**: Lista arquivos do Google Drive compartilhados.
- **criarDocumento**: Cria documentos (requer Google Workspace ou documentos criados manualmente).
- **utils**: Funções utilitárias de autenticação e comunicação com APIs do Google.

## 🚀 Como usar

### Pré-requisitos

- Configurar credenciais do Google Service Account.
- Habilitar Google Docs API e Google Drive API no projeto do Google Cloud.
- Compartilhar documentos/pastas com o email do service account para acesso.

### Variáveis de Ambiente

No arquivo `.env`:

```
GOOGLE_SERVICE_ACCOUNT='{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/...",
  "universe_domain": "googleapis.com"
}'
```

**Importante**: A credencial do service account deve ser fornecida como uma string JSON completa em uma das seguintes variáveis:

- `GOOGLE_SERVICE_ACCOUNT`
- `DOCGO_GOOGLE_SERVICE_ACCOUNT`
- `googleServiceAccount`
- `docgoGoogleServiceAccount`

### Exemplos de uso

**Ler documento (requer compartilhamento prévio):**

```bash
./docgo gdocs lerDocumento "ID_DO_DOCUMENTO"
```

**Atualizar documento (requer compartilhamento prévio):**

```bash
./docgo gdocs atualizarDocumento '{"documentId":"ID_DO_DOCUMENTO","content":"Novo conteúdo"}'
```

**Listar arquivos (lista arquivos compartilhados com o service account):**

```bash
./docgo gdocs listarArquivos
```

**Criar documento (limitado por quota de armazenamento):**

```bash
./docgo gdocs criarDocumento '{"titulo":"Meu Doc","conteudo":"Olá, mundo!"}'
```

**Nota**: A criação de documentos requer quota de armazenamento disponível. Service accounts gratuitos têm 0GB de quota.

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
- A autenticação é feita via **Service Account**, que permite acesso programático sem necessidade de OAuth2 interativo.
- O token de acesso é gerado automaticamente usando as credenciais do service account e tem cache de 1 hora.
- **Compartilhamento obrigatório**: Para que o service account acesse documentos específicos, você precisa compartilhar esses documentos com o email do service account (`client_email` no JSON de credenciais).
- **Limitação de criação de documentos**: Service accounts gratuitos têm 0GB de quota de armazenamento, impedindo a criação de novos documentos. Para criar documentos:
  - Crie manualmente no Google Docs e compartilhe com o service account, ou
  - Use uma conta Google Workspace com quota de armazenamento
- **APIs necessárias**: Certifique-se de habilitar Google Docs API e Google Drive API no projeto do Google Cloud.
- **Permissões IAM**: O service account deve ter as permissões adequadas no projeto (recomendado: Owner ou Editor).
- Consulte a documentação do Google Cloud para criar e configurar um Service Account com as permissões adequadas.
- Os comandos podem variar conforme a configuração do seu ambiente DocGo.

## 📄 Licença

MIT
