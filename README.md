# 🛡️ KapiTrace — Threat Intelligence & IP Reputation

🔗 **Repositório Público**: [https://github.com/hug0mgs/dsai-ap1-kapitrace](https://github.com/hug0mgs/dsai-ap1-kapitrace)

> Plataforma de inteligência de ameaças e verificação de reputação de IPs, domínios e hashes. A integração de emails ainda não está disponível.
> Consulta **7 serviços externos**, conforme as chaves e o plano configurados, para produzir um **score de reputação unificado**. Sem evidência disponível, informa dados insuficientes; não fabrica reputação.

---

## 🤖 Ferramentas e Modelos de IA Utilizados

| Ferramenta / Plataforma | Modelo | Função no Projeto |
| ----------------------- | ------ | ----------------- |
| **Codex** | **GPT-6** | SPEC datada, migração de mocks para HTTP nativo, resiliência/cache, segurança e testes de interface via Chrome DevTools Protocol |
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
| **Banco**      | SQLite + Prisma ORM (schema atual)                   |
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
│   └── 2026-10-06-real-api-integration.md
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
npm run db:generate    # Gera o cliente Prisma
npm run db:push        # Gera tabelas no banco de dados
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

Timeout por fonte: 5s; deadline total: 10s; no máximo um retry para rede/502/503/504. 429 e 503 ativam cooldown conforme `Retry-After`. Intervalos por fornecedor e capacidade global são configuráveis no exemplo; ajuste às cotas da sua conta. O endpoint público limita 30 consultas/minuto por IP. Limites e single-flight são locais a cada processo; múltiplas instâncias exigem coordenação compartilhada.

### Score e cache real

`GET /api/lookup/{ip|domain|hash}/{indicador}` aceita IPv4/IPv6 públicos, MD5/SHA-1/SHA-256 e domínios normalizados. Tipos não suportados e entradas inválidas retornam 400 antes de consultar fornecedores. O ThreatScore mantém pesos 35/40/15/10 e renormaliza apenas métricas disponíveis; cobertura de evidência acompanha a análise. Sem métrica válida, o score é nulo, nunca zero por indisponibilidade.

Cache completo: 24h. Cache parcial com score: 5min. HIT retorna `source: cache` sem HTTP externo; MISS retorna `source: api`. Caches da simulação antiga são invalidados pela versão `real-api-v1`. Se a avaliação falhar, um último resultado real de até 48h pode ser retornado como `stale: true`, sem renovar a coleta. Sem fontes acessíveis e sem cache adequado, retorna 503; respostas válidas sem registro retornam dados insuficientes. A interface identifica erros, dados parciais e antigos.

Cadastro/login reais ficam em `/login`; busca em `/lookup`; inclusão, listagem e remoção da watchlist em `/dashboard`. A sessão usa `sessionStorage` e termina ao fechar a aba ou sair. Estatísticas e notificações fictícias foram removidas.

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

Os testes usam `node:test`/`node:assert`, SQLite temporário separado por processo e interceptação nativa somente na fronteira HTTP externa. Tráfego externo não interceptado é bloqueado nos testes. Chrome/Chromium instalado é necessário para E2E; `CHROME_BIN` aponta para seu executável. O runner CDP/WebSocket é próprio, sem Playwright/Selenium. O fluxo HTTP anterior foi preservado em `tests/integration/workflow.test.ts`.

### Scripts Disponíveis (Backend)
| Script        | Comando                  |
| ------------- | ------------------------ |
| `npm run dev` | `tsx watch src/server.ts`|
| `npm run build` | `tsc`                 |
| `npm run start` | `node dist/server.js` |
| `npm run db:push` | `prisma db push`   |
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
github.com/AlDanial/cloc v 2.06  T=4.55 s (1896.4 files/s, 559691.6 lines/s)
---------------------------------------------------------------------------------------
Language                             files          blank        comment           code
---------------------------------------------------------------------------------------
JavaScript                            5301          57967          95220        1509742
JSON                                   766             47              0         274422
TypeScript                            1546          28108         213083         237781
Markdown                               772          27851            432          75462
C/C++ Header                            11           1661           1255           9493
C++                                     10            449            726           4704
YAML                                   121            138             90           1630
CSS                                      4            193             57           1159
Bourne Shell                             4            180            114            842
Text                                    18            158              0            664
Python                                   8             30             27            562
Windows Module Definition                5             83              0            451
INI                                     17             69              0            280
Go                                       1             23              7            249
SVG                                     28              0              0            127
PHP                                      1             13             19            124
Prisma Schema                            2             22              0            116
make                                     3             24              4             48
Bourne Again Shell                       2             11              1             43
HTML                                     4             10              0             34
Dockerfile                               1              9             17             31
XML                                      1              0              0             10
CoffeeScript                             1              1              0              0
---------------------------------------------------------------------------------------
SUM:                                  8627         117047         311052        2117974
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
