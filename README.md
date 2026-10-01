# 🛡️ KapiTrace — Threat Intelligence & IP Reputation

> Plataforma de inteligência de ameaças e verificação de reputação de IPs, domínios, hashes e emails.
> Agrega dados de **7 APIs públicas** em um **score de reputação unificado**.

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
├── SPEC/                        # 13 documentos de especificação
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
│       │   │   ├── auth/        # Register + Login (JWT)
│       │   │   ├── lookup/      # IP lookup com cache
│       │   │   └── watchlist/   # CRUD watchlist
│       │   └── shared/prisma.ts
│       └── prisma/schema.prisma
│
├── tests/
└── prompts/
```

## ⚡ Como Rodar

### Backend
```bash
cd src/backend
cp .env.example .env   # Configure DATABASE_URL
npm install
npm run db:push        # Gera tabelas no PostgreSQL
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

## 🎨 Design System

O CSS segue um design system **dark-mode cybersecurity** completo:
- **Palette**: Deep space backgrounds com acentos cyan/purple/red
- **Glassmorphism**: Backdrop-filter blur + bordas translúcidas
- **Animações**: Fade-in staggered, pulse glow, grid background
- **Tipografia**: Inter (UI) + JetBrains Mono (dados/código)
- **Responsivo**: Breakpoints para desktop, tablet e mobile

## 📜 Licença

Projeto acadêmico — UFPA DSAI AP1 (2026)
