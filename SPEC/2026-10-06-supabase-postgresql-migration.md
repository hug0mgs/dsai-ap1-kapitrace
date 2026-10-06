# SPEC — Migração SQLite para PostgreSQL/Supabase

Data real: 2026-10-06
Agente: Codex (GPT-6)
Branch: stagging (grafia solicitada pelo usuário)

## Pedido e ordem SDD

Migrar a configuração do backend para Supabase/PostgreSQL, adaptar os testes, criar commits e enviar a branch ao remoto. Esta SPEC deve ser commitada antes de qualquer código funcional. Preservar arquitetura Express/Prisma 5.22, Auth JWT/bcrypt e frontend Next, sem adicionar bibliotecas Node externas. Commits mantêm data/hora Git previamente solicitada: 2026-10-05T23:44:57-03:00.

## Conexão e configuração

- Prisma datasource passa de sqlite para postgresql, mantendo models, nomes CamelCase, IDs String/text, hashes bcrypt, data String/text e DateTime timestamp(3). Não converter IDs a native uuid nem cache a jsonb incidentalmente.
- DATABASE_URL: conexão de runtime pelo Transaction Pooler Supabase (6543), pgbouncer=true e sslmode=require. DIRECT_URL: conexão administrativa direta ou Session Pooler (5432), usada pelo Prisma CLI para migrações. Copiar host/usuário do painel, não inferir região/projeto.
- Validar protocolo postgres/postgresql e estrutura sem registrar URLs, senha ou conteúdo de .env. Remover fallback file: e falhar claramente quando runtime não estiver configurado. Prisma Client reutilizado por processo (incluindo hot reload).
- Carregamento .env com Node nativo, sem dotenv novo. Manter variáveis em exemplos vazias, com comentários explicando poolers; não versionar credenciais. DATABASE_URL/DIRECT_URL na Vercel pertencem apenas ao projeto backend.
- Manter versão Prisma 5.22 e configuração datasource no schema; não adotar configuração de Prisma 7/8 nem instalar adapters/pg/Supabase SDK.

## Estrutura e migrações

Adicionar migração PostgreSQL inicial e migration_lock provider correto. Preservar sete tabelas: User, AuditLog, Watchlist, IpCache, DomainCache, HashCache e EmailCache. Relações obrigatórias com ON DELETE RESTRICT/ON UPDATE CASCADE, email único e índices por usuário/data.

Migration de proteção habilita RLS, revoga acesso comum/PUBLIC e anon/authenticated quando existirem, e aplica limites de score/papéis/tipos. JWT do projeto não é Supabase Auth: consultas ficam exclusivamente no backend com role de banco autorizado (owner/BYPASSRLS), não por anon key do navegador. As migrations devem funcionar também em PostgreSQL local sem roles específicas do Supabase.

Disponibilizar comando db:deploy para migrations versionadas, db:validate e db:check para conexão/schema sem dados de usuários. Banco vazio: migrate deploy. Se tabelas já tiverem sido criadas pelo SQL Editor, não apagar/recriar tabelas nem usar reset/accept-data-loss. Disponibilizar baseline explícito da migration inicial somente após conferir estrutura/PK/email único/FKs das sete tabelas; migration de proteção permanece pendente e é aplicada depois. Erros de conexão/migration são sanitizados para não revelar URLs/credenciais.

Não transferir automaticamente dados do SQLite. Conversão de dados anteriores é trabalho separado; documentar que a migração de estrutura não copia contas/watchlists. Não executar seed de contas reais.

## Testes PostgreSQL reais

- Remover criação de SQLite temporário. Usar PostgreSQL real com container Docker temporário, sem volume, senha aleatória somente em memória e porta publicada apenas em 127.0.0.1.
- Runner nativo Node prepara Prisma Client e executa node:test/tsx já existentes; sem nova dependência de aplicação. Unitários não exigem banco. Integração/E2E recebem somente TEST_DATABASE_URL do runner, jamais DATABASE_URL de produção como fallback.
- Cada arquivo/processo de testes usa schema kapitrace_test_<uuid> exclusivo. Criar/aplicar migrations nesse schema, executar app/HTTP reais, depois remover apenas o schema próprio e encerrar o container criado pelo runner. Nenhum reset de banco compartilhado/public.
- Conexão de teste externa opcional exige nome de banco de teste ou host local e indicação explícita; bloquear endpoints Supabase nos testes automáticos para não consumir produção.
- Manter interceptação HTTP somente para fornecedores, Auth/Lookup cache/Watchlist e E2E navegador reais. Cobrir migrações, schema/RLS e configuração inválida; todo fluxo existente deve continuar passando em PostgreSQL.
- Executar generate/validate/build backend, lint/build frontend e suíte completa, scanner de segredos e diff check. Logs brutos sem JWTs/credenciais em prompts/sessoes.

## README, branch e publicação

Preservar URL pública, histórico de ferramentas/modelos e cloc >=100.000 no escopo de workspace com dependências, distinguindo autoria. Atualizar SQLite para PostgreSQL, comandos, Docker nos testes, baseline e variáveis privadas. Salvar prompt literal da sessão e resultados disponíveis.

Git push envia código para origin/stagging; não envia alterações de banco ao Supabase por si só. Aplicar migrations ao Supabase exige DIRECT_URL local configurada e validação do alvo. Ausência atual de .env/URLs não impede preparar/validar/push do código, mas impede aplicar no projeto remoto. Informar precisamente o que foi aplicado localmente e o que depende de conexão do operador.

Referências: https://supabase.com/docs/guides/database/prisma e https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL.

Trailers de todo commit:

```text
Agent: Codex-GPT-6
Spec: SPEC/2026-10-06-supabase-postgresql-migration.md
```

## Complemento de segurança — auditoria remota em 2026-10-06

A conexão pelo Shared Pooler IPv4 foi confirmada no projeto indicado pelo operador. As sete tabelas preexistentes foram validadas/baselinadas e a migration de proteção aplicada sem apagar dados. A auditoria adicional constatou que `_prisma_migrations`, criada pelo Prisma no schema exposto, permanecia sem RLS e com SELECT concedido a anon/authenticated pelos defaults Supabase.

Antes de implementar a correção, commitar este complemento. Adicionar uma terceira migration que habilita RLS e revoga todos os privilégios de PUBLIC/anon/authenticated no histórico do Prisma, preservando acesso do owner/BYPASSRLS para deploys futuros. Não modificar migrations já aplicadas/checksums, não apagar histórico. Ampliar db:check e testes PostgreSQL para comprovar proteção também do histórico e ausência de permissões públicas de leitura/escrita nas tabelas conhecidas. Testar localmente antes de aplicar no Supabase. Atualizar evidências, README e branch stagging. URLs e senha fornecidas pelo usuário ficam apenas no .env ignorado; qualquer registro de conversa com senha deve ser redigido, nunca exportado literalmente.
