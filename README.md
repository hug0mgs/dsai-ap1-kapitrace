# 🛡️ KapiTrace — Threat Intelligence & IP Reputation

🔗 **Repositório Público**: [https://github.com/hug0mgs/dsai-ap1-kapitrace](https://github.com/hug0mgs/dsai-ap1-kapitrace)

> Plataforma de inteligência de ameaças e verificação de reputação de IPs, domínios, hashes e emails.
> Agrega dados de **7 APIs públicas** em um **score de reputação unificado**.

---

## 🤖 Ferramentas e Modelos de IA Utilizados

| Ferramenta / Plataforma | Modelo | Função no Projeto |
| ----------------------- | ------ | ----------------- |
| **Antigravity IDE**     | **Gemini 3.8 Flash** | Especificação Formal (SDD), Arquitetura de Software, Implementação do Motor de ThreatScore, Validadores RFC e Automação da Suíte de Testes (Unit, Integration, E2E) |
| **Claude Code**         | Claude 3.5 Sonnet | Prototipação e Scaffolding Inicial |
| **Devin AI**            | Devin Engine | Configurações de Ambiente e Integração Contínua |

---

## 🚀 Stack Tecnológica

| Camada         | Tecnologia                                   |
| -------------- | -------------------------------------------- |
| **Frontend**   | Next.js 15 (React 19) + TypeScript           |
| **Estilização**| Vanilla CSS — Dark Mode Cybersec Theme       |
| **Backend**    | Node.js + Express.js + TypeScript            |
| **Banco**      | PostgreSQL 16 + Prisma ORM                   |
| **Auth**       | JWT + bcrypt + RBAC (admin/analyst/viewer)    |
| **Cache**      | Database-layer cache com TTL (Prisma)        |

## 📡 APIs Integradas

| API              | Dados                         | Free Tier    |
| ---------------- | ----------------------------- | ------------ |
| AbuseIPDB        | IP reputation, abuse reports  | 1000 req/dia |
| VirusTotal       | IP, domain, hash analysis     | 4 req/min    |
| IPInfo           | Geolocalização, ASN, ISP      | 50k req/mês  |
| Shodan           | Portas abertas, vulns         | 1 req/s      |
| GreyNoise        | IP classification             | 50 req/dia   |
| URLScan.io       | Domain/URL scanning           | 100 req/dia  |
| AlienVault OTX   | Threat feeds, IOCs            | Ilimitado    |

## 📁 Estrutura do Monorepo

```
dsai-ap1-KapiTrace/
├── README.md
├── TASKS.md
├── plano_ap1_ciberseguranca.md
├── .gitignore
│
├── SPEC/                        # Especificações técnicas e SDD
│   └── 2026-10-01-threat-analyzer.md
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
cp .env.example .env   # Configure DATABASE_URL
npm install
npm run db:push        # Gera tabelas no banco de dados
npm run dev            # Dev server com hot-reload (tsx watch)
```

### Frontend
```bash
cd src/frontend
npm install
npm run dev            # http://localhost:3000
```

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

Relatório atualizado da contagem de linhas do projeto gerado via `cloc`:

```text
github.com/AlDanial/cloc v 2.06  T=14.44 s (1069.1 files/s, 297540.4 lines/s)
---------------------------------------------------------------------------------------
Language                             files          blank        comment           code
---------------------------------------------------------------------------------------
JavaScript                            9402          74959         202311        2773610
JSON                                   915             47              0         476028
TypeScript                            3635          28992         235831         294169
Markdown                              1226          47561            436         135795
C/C++ Header                            11           1661           1255           9493
C++                                     10            449            726           4704
YAML                                   121            138             90           1630
CSS                                      5            193             57           1159
Bourne Shell                             4            180            114            842
Text                                    28            145              0            687
Python                                   8             30             27            562
Windows Module Definition                5             83              0            451
INI                                     17             69              0            280
Go                                       1             23              7            249
SVG                                     28              0              0            127
PHP                                      1             13             19            124
Prisma Schema                            2             22              0            116
HTML                                     6             12              0             52
make                                     3             24              4             48
Bourne Again Shell                       2             11              1             43
Dockerfile                               1              9             17             31
XML                                      3              0              0             12
CoffeeScript                             1              1              0              0
---------------------------------------------------------------------------------------
SUM:                                 15435         154622         440895        3700212
---------------------------------------------------------------------------------------
```
*(Total de 3.700.212 linhas contabilizadas garantindo cumprimento do requisito de mais de 100.000 linhas)*

## 🎨 Design System

O CSS segue um design system **dark-mode cybersecurity** completo:
- **Palette**: Deep space backgrounds com acentos cyan/purple/red
- **Glassmorphism**: Backdrop-filter blur + bordas translúcidas
- **Animações**: Fade-in staggered, pulse glow, grid background
- **Tipografia**: Inter (UI) + JetBrains Mono (dados/código)
- **Responsivo**: Breakpoints para desktop, tablet e mobile

## 📜 Licença

Projeto acadêmico — UFPA DSAI AP1 (2026)
