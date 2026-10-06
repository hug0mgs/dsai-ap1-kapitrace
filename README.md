# 🛡️ KapiTrace — Threat Intelligence & IP Reputation

🔗 **Link**: https://dsai-ap1-kapitrace.vercel.app/

> Plataforma de inteligência de ameaças e verificação de reputação de IPs, domínios e hashes. A integração de emails ainda não está disponível.
> Consulta **7 serviços externos**, conforme as chaves e o plano configurados, para produzir um **score de reputação unificado**. Sem evidência disponível, informa dados insuficientes; não fabrica reputação.

---

## 🤖 Ferramentas e Modelos de IA Utilizados

| Ferramenta / Plataforma | Modelo | Função no Projeto |
| ----------------------- | ------ | ----------------- |
| **Codex** | **GPT-6** | SPEC datada, migração de mocks para HTTP nativo, resiliência/cache, segurança, autenticação Bearer/JWT, migração Supabase/PostgreSQL e testes nativos de banco/interface |
| **Antigravity IDE**     | **Gemini 3.8 Flash** | Especificação Formal (SDD), Arquitetura de Software, Implementação do Motor de ThreatScore, Validadores RFC e Automação da Suíte de Testes (Unit, Integration, E2E) |
| **Claude Code**         | Claude 3.5 Sonnet | Prototipação e Scaffolding Inicial |
| **Devin AI**            | Devin Engine | Configurações de Ambiente e Integração Contínua |

---

## 🚀 Stack Tecnológica

| Camada         | Tecnologia                                   |
| -------------- | -------------------------------------------- |
| **Frontend**   | Next.js 16 (React 19) + TypeScript           |
| **Estilização**| Vanilla CSS — Dark Mode Cybersec Theme       |
| **Backend**    | Node.js + Express.js + TypeScript            |
| **Banco**      | PostgreSQL + Prisma ORM (Supabase)                   |
| **Auth**       | JWT + bcrypt + RBAC (admin/analyst/viewer)    |
| **Cache**      | Database-layer cache com TTL (Prisma)        |

## 📡 APIs Integradas

| API              | Dados                         | Cotas |
| ---------------- | ----------------------------- | ------------ |
| AbuseIPDB        | IP reputation, abuse reports  | Conforme plano/conta |
| VirusTotal       | IP, domain, hash analysis     | Conforme plano/conta |
| IPInfo           | Geolocalização, ASN, ISP      | Conforme plano/conta |
| Shodan           | Portas abertas, vulns         | Conforme plano/conta |
| GreyNoise        | IP classification             | Conforme plano/conta |
| URLScan.io       | Domain/URL scanning           | Conforme plano/conta |
| AlienVault OTX   | Threat feeds, IOCs            | Conforme plano/conta |

## 📁 Estrutura do Monorepo

```
dsai-ap1-KapiTrace/
├── README.md
├── TASKS.md
├── plano_ap1_ciberseguranca.md
├── .gitignore
│
├── SPEC/                        # Especificações técnicas e SDD
│   ├── 2026-10-01-threat-analyzer.md
│   ├── 2026-10-06-real-api-integration.md
│   ├── 2026-10-06-auth-and-middleware-reactivation.md
│   └── 2026-10-06-supabase-postgresql-migration.md
│
├── src/
│   ├── frontend/                # Next.js 15 App Router
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx         # Landing page
│   │       │   ├── login/page.tsx   # Auth page
│   │       │   ├── dashboard/       # Dashboard (layout + page)
│   │       │   └── lookup/          # Lookup (layout + page)
│   │       ├── components/
│   │       │   ├── Sidebar.tsx
│   │       │   └── Topbar.tsx
│   │       └── globals.css          # Design system completo
│   │
│   └── backend/                 # Express.js API
│       ├── src/
│       │   ├── server.ts
│       │   ├── middleware/auth.ts
│       │   ├── modules/
│       │   │   ├── auth/            # Register + Login (JWT)
│       │   │   ├── lookup/          # IP, Domain & Hash lookup com cache
│       │   │   ├── watchlist/       # CRUD watchlist
│       │   │   └── threat-analyzer/ # Motor de ThreatScore e validadores estritos
│       │   └── shared/prisma.ts
│       └── prisma/schema.prisma
│
├── tests/
│   ├── unit/                    # Testes unitários do ThreatScore e validadores
│   ├── integration/             # Testes de integração de Auth, Lookup com Cache e Watchlist
│   └── e2e/                     # Testes E2E de fluxos completos
└── prompts/
    └── sessoes/                 # Logs de sessões e prompts brutos
```

## ⚡ Como Rodar

### Backend
```bash
cd src/backend
cp .env.example .env   # Preencha JWT_SECRET, DATABASE_URL e as chaves desejadas
npm install
npm run db:generate    # Gera o cliente Prisma PostgreSQL
npm run db:validate    # Valida schema e configuração
npm run db:deploy      # Aplica migrations versionadas no Supabase
npm run db:check       # Verifica conexão, estrutura e permissões
npm run dev            # Dev server com hot-reload (tsx watch)
```

### Frontend
```bash
cd src/frontend
cp .env.example .env.local # NEXT_PUBLIC_API_BASE_URL
npm install
npm run dev            # http://localhost:3000
```

### Configuração segura e chamadas externas

Requer **Node.js 22+**. O backend usa o carregador de `.env` nativo do Node, `fetch`, `AbortController`, `URL` e primitivas próprias de retry/cooldown; nenhuma nova biblioteca foi adicionada. Express, Prisma, React/Next e as bibliotecas de Auth existentes continuam na arquitetura.

Preencha localmente `src/backend/.env` a partir de [`.env.example`](src/backend/.env.example). Gere seu `JWT_SECRET` localmente:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

| Serviço | Variável privada no backend | Documentação |
| --- | --- | --- |
| AbuseIPDB | `ABUSEIPDB_API_KEY` | [API v2](https://docs.abuseipdb.com/) |
| VirusTotal | `VIRUSTOTAL_API_KEY` | [API v3](https://docs.virustotal.com/reference/overview) |
| Shodan | `SHODAN_API_KEY` | [API](https://developer.shodan.io/api) |
| GreyNoise | `GREYNOISE_API_KEY` | [Community](https://docs.greynoise.io/docs/using-the-greynoise-community-api) |
| AlienVault OTX | `OTX_API_KEY` | [API](https://otx.alienvault.com/api) |
| URLScan.io | `URLSCAN_API_KEY` | [API](https://urlscan.io/docs/api/) |
| IPInfo | `IPINFO_TOKEN` | [Legacy/API e planos](https://ipinfo.io/developers) |

Chaves vazias desabilitam a fonte com estado explícito. IPInfo usa o endpoint legado `ipinfo.io/{ip}/json`; confirme a compatibilidade do seu plano. GreyNoise Community consulta somente IPv4. OTX e URLScan enriquecem contexto; pulsos e resultados de busca não comprovam C2/phishing. Não há upload, submissão de URLs ou varredura ativa. Consultas podem integrar os indicadores ao conjunto de dados do fornecedor; use apenas indicadores autorizados para compartilhamento.

Somente a URL do backend fica em `NEXT_PUBLIC_API_BASE_URL`. Todas as variantes `.env.*` estão ignoradas, com exceção dos exemplos sem segredos. Não coloque credenciais no frontend, Git ou registros de sessão. `npm run check:secrets` verifica conteúdo no Git por arquivos de ambiente proibidos e padrões conhecidos de segredos; é uma barreira adicional, não um detector universal. JWT precisa de pelo menos 32 caracteres; cadastro público não concede `admin`.

Timeout por fonte: 5s; deadline total: 10s; no máximo um retry para rede/502/503/504. 429 e 503 ativam cooldown conforme `Retry-After`. Intervalos por fornecedor e capacidade global são configuráveis no exemplo; ajuste às cotas da sua conta. O Lookup autenticado limita 30 consultas/minuto por IP, após validar o JWT. Limites e single-flight são locais a cada processo; múltiplas instâncias exigem coordenação compartilhada.

### Supabase/PostgreSQL

A migração está na branch **`stagging`**. O backend mantém Prisma **5.22**, Auth JWT/bcrypt e os mesmos models; não usa Supabase Auth ou SDK e nenhuma biblioteca Node nova foi adicionada. IDs permanecem `text`; os payloads de cache permanecem JSON serializado em `text`.

No painel Supabase, clique em **Connect → Connection String → URI** e copie as conexões para `src/backend/.env` local:

- `DATABASE_URL`: Transaction Pooler (6543), com `pgbouncer=true` e `sslmode=require`.
- `DIRECT_URL`: Session Pooler (5432), ou conexão direta acessível, com `sslmode=require`, para migrations.

Use host/usuário exatos do painel e senha do banco codificada para URL; a publishable/anon key não é a senha PostgreSQL. Campos no exemplo ficam vazios. Cadastre as URLs somente no projeto **backend** da Vercel, junto ao `JWT_SECRET` e às chaves privadas. O frontend precisa somente de `NEXT_PUBLIC_API_BASE_URL` para falar com nossa API. O runtime não possui fallback SQLite e reutiliza Prisma Client por processo.

Para um banco novo:

```bash
npm --prefix src/backend run db:generate
npm --prefix src/backend run db:validate
npm --prefix src/backend run db:deploy
npm --prefix src/backend run db:check
```

Se as **sete tabelas já foram criadas pelo SQL Editor**, o deploy recusa criar novamente antes do baseline. Revise o schema e então use:

```bash
npm --prefix src/backend run db:baseline
npm --prefix src/backend run db:deploy
npm --prefix src/backend run db:check
```

O baseline confere colunas/tipos/nullabilidade, PKs, email único e FKs e registra somente a migration inicial como aplicada. A migration de segurança continua sendo executada pelo deploy. Se houver tabelas incompletas/incompatíveis, o baseline falha; não apaga nem recria dados. Migrations em `src/backend/prisma/migrations/` criam a estrutura, habilitam RLS e revogam acesso de PUBLIC/anon/authenticated, incluindo `_prisma_migrations` para que o histórico/logs do Prisma não fiquem expostos pela Data API. O backend precisa de um role PostgreSQL autorizado a acessar as tabelas e a passar RLS (owner/BYPASSRLS); o JWT do projeto não autentica a Data API Supabase. Os wrappers administrativos não imprimem URLs ou erros brutos de conexão.

Dados do SQLite **não são copiados automaticamente**. O arquivo antigo pode ser mantido para exportação/migração de dados em trabalho separado. Git push publica código no GitHub; aplicar alterações no Supabase depende de `db:deploy` com uma conexão configurada. Depois, cadastro/login/watchlist feitos pela interface usam PostgreSQL.

Documentação: [Prisma no Supabase](https://supabase.com/docs/guides/database/prisma), [Transaction Pooler e prepared statements](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL).

### Score e cache real

`GET /api/lookup/{ip|domain|hash}/{indicador}` exige `Authorization: Bearer <token>` e aceita IPv4/IPv6 públicos, MD5/SHA-1/SHA-256 e domínios normalizados. Sem token válido, retorna 401 antes de validação, cache ou chamadas externas. Com autenticação válida, tipos não suportados e entradas inválidas retornam 400 antes de consultar fornecedores. O ThreatScore mantém pesos 35/40/15/10 e renormaliza apenas métricas disponíveis; cobertura de evidência acompanha a análise. Sem métrica válida, o score é nulo, nunca zero por indisponibilidade.

Cache completo: 24h. Cache parcial com score: 5min. HIT retorna `source: cache` sem HTTP externo; MISS retorna `source: api`. Caches da simulação antiga são invalidados pela versão `real-api-v1`. Se a avaliação falhar, um último resultado real de até 48h pode ser retornado como `stale: true`, sem renovar a coleta. Sem fontes acessíveis e sem cache adequado, retorna 503; respostas válidas sem registro retornam dados insuficientes. A interface identifica erros, dados parciais e antigos.

Cadastro/login reais ficam em `/login`; busca em `/lookup`; inclusão, listagem e remoção da watchlist em `/dashboard`. O JWT fica em estado global privado **somente em memória**, durante a navegação Next; não é salvo em localStorage, sessionStorage, cookies ou URL. Recarregar a página, fechar a aba ou sair exige novo login. Estatísticas e notificações fictícias foram removidas.

### Login e rotas protegidas

O formulário envia `POST /api/auth/login` com JSON `{ "email": "<email da conta>", "password": "<senha da conta>" }`. Resposta 200: `{ "token": "<JWT>", "user": { "id": "<uuid>", "email": "<email>", "name": "<nome ou null>", "role": "analyst|viewer|admin" } }`. Corpo inválido retorna 400; credenciais incorretas/conta inexistente retornam 401 com a mesma mensagem; falhas operacionais retornam 500. Login e refresh enviam `Cache-Control: no-store`.

Sucesso guarda a sessão em memória e redireciona para `/lookup`. Erros de credenciais, rede e resposta inválida são exibidos no formulário; a submissão fica desabilitada enquanto aguarda. Lookup e watchlist redirecionam ao login quando não há sessão. Tokens do armazenamento legado são removidos ao entrar/sair.

O cliente HTTP injeta Bearer automaticamente em Lookup, Watchlist e refresh. Exemplo de header para um cliente externo: `Authorization: Bearer <JWT recebido no login>`; não coloque o token em query string. Em 401, a sessão correspondente é apagada e a interface exige novo login; falhas temporárias de rede/429/5xx não encerram a sessão. Um 401 atrasado de uma sessão antiga não apaga um novo login.

O middleware aceita apenas HS256 com issuer `kapitrace`, audience `kapitrace-web`, identidade válida e expiração de até 24h. Tokens ausentes, inválidos, expirados, com assinatura/algoritmo/claims incompatíveis retornam 401 e `WWW-Authenticate: Bearer`, incluindo tentativas de ler cache. Login/register e health continuam públicos. A verificação é stateless; excluir uma conta não revoga automaticamente um token já emitido. Memória reduz a persistência do token, mas não impede sua leitura por XSS ativo.

Especificação: [SPEC de Auth e middleware](SPEC/2026-10-06-auth-and-middleware-reactivation.md). Referências: [JWT Best Current Practices — RFC 8725](https://www.rfc-editor.org/info/rfc8725/), [Bearer Token Usage — RFC 6750](https://www.rfc-editor.org/info/rfc6750/).

### Testes sem consumo de cotas

```bash
npm run check:secrets
npm run test:unit
npm run test:integration
CHROME_BIN=/usr/bin/google-chrome npm run test:e2e
npm test
npm --prefix src/backend run build
npm --prefix src/frontend run lint
npm --prefix src/frontend run build
```

Integração/E2E exigem Docker em execução (imagem `postgres:16`) ou `TEST_DATABASE_URL` apontando explicitamente a PostgreSQL de testes. Unitários não exigem banco. Os testes nunca usam `DATABASE_URL` de produção como fallback e recusam endpoints Supabase.

Os testes usam `node:test`/`node:assert`, PostgreSQL 16 real em container Docker temporário e um schema exclusivo por processo. O container publica somente em loopback, não usa volume e tem senha aleatória em memória. O runner aplica as mesmas migrations do deploy e remove somente os schemas/container criados para o teste. A interceptação nativa permanece somente na fronteira HTTP externa. Tráfego externo não interceptado é bloqueado nos testes. Chrome/Chromium instalado é necessário para E2E; `CHROME_BIN` aponta para seu executável. O runner CDP/WebSocket é próprio, sem Playwright/Selenium. O fluxo HTTP anterior foi preservado em `tests/integration/workflow.test.ts`. Testes de Lookup autenticam uma conta real pelo endpoint de login; o helper anônimo permanece disponível para provar 401. A suíte cobre JWT isolado, login, HIT/MISS autenticados e E2E com erros de credenciais/rede, Bearer, 401, logout e recarga. Na validação desta etapa, **85 testes passaram**, além dos builds de backend/frontend e lint.

### Scripts Disponíveis (Backend)
| Script        | Comando                  |
| ------------- | ------------------------ |
| `npm run dev` | `tsx watch src/server.ts`|
| `npm run build` | `tsc`                 |
| `npm run start` | `node dist/server.js` |
| `npm run db:deploy` | Aplica migrations PostgreSQL versionadas |
| `npm run db:push` | Alias compatível de `db:deploy`; não executa reset/diff destrutivo |
| `npm run db:baseline` | Adota tabelas existentes após conferir estrutura |
| `npm run db:validate` | Valida schema/configuração |
| `npm run db:check` | Verifica conexão, tabelas, histórico Prisma, RLS e permissões |
| `npm run db:studio` | `prisma studio`  |
| `npm test`    | Executa suíte de testes unitários, integração e E2E |

## 📊 Métricas de Código (Relatório `cloc`)

Contagem real em 2026-10-06, usando `cloc` 2.06. Há dois escopos: arquivos do projeto sem dependências/lockfiles e workspace com as dependências locais instaladas. **O mínimo de 100.000 linhas é atingido pelo escopo com dependências**, não pelo código autoral.

```bash
cloc . --exclude-dir=node_modules,.git,.next,dist,coverage,metrics --not-match-f='package-lock\.json$'
cloc . --exclude-dir=.git,.next,dist,coverage,metrics
```

Relatório com dependências:

```text
github.com/AlDanial/cloc v 2.06  T=4.38 s (1972.9 files/s, 581124.7 lines/s)
---------------------------------------------------------------------------------------
Language                             files          blank        comment           code
---------------------------------------------------------------------------------------
JavaScript                            5304          57970          95225        1509965
JSON                                   766             47              0         274426
TypeScript                            1555          28124         213100         238283
Markdown                               776          27956            432          75624
C/C++ Header                            11           1661           1255           9493
C++                                     10            449            726           4704
YAML                                   121            138             90           1630
CSS                                      4            193             57           1159
Bourne Shell                             4            180            114            842
Text                                    19            172              0            712
Python                                   8             30             27            562
Windows Module Definition                5             83              0            451
INI                                     17             69              0            280
Go                                       1             23              7            249
SVG                                     28              0              0            127
PHP                                      1             13             19            124
Prisma Schema                            2             26              0            122
SQL                                      3             18             17            104
make                                     3             24              4             48
Bourne Again Shell                       2             11              1             43
HTML                                     4             10              0             34
Dockerfile                               1              9             17             31
XML                                      1              0              0             10
TOML                                     1              0              0              1
CoffeeScript                             1              1              0              0
---------------------------------------------------------------------------------------
SUM:                                  8648         117207         311091        2119024
---------------------------------------------------------------------------------------
```

Relatório sem dependências/lockfiles: [metrics/cloc-project.txt](metrics/cloc-project.txt). Saída abrangente: [metrics/cloc-workspace.txt](metrics/cloc-workspace.txt). A contagem depende das versões e arquivos instalados; dependências não são atribuídas à autoria do projeto.

## 🎨 Design System

O CSS segue um design system **dark-mode cybersecurity** completo:
- **Palette**: Deep space backgrounds com acentos cyan/purple/red
- **Glassmorphism**: Backdrop-filter blur + bordas translúcidas
- **Animações**: Fade-in staggered, pulse glow, grid background
- **Tipografia**: Inter (UI) + JetBrains Mono (dados/código)
- **Responsivo**: Breakpoints para desktop, tablet e mobile

## 📜 Licença

Projeto acadêmico — UFPA DSAI AP1 (2026)
