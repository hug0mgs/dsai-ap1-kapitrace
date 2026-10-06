# SPEC — Login JWT e reativação do middleware

Data da sessão: 2026-10-06
Agente: Codex (GPT-6)
Escopo: complementar a integração real já existente, mantendo Express/Prisma, Next/React, JWT/bcrypt existentes e testes nativos. Nenhuma biblioteca nova.

## 1. Diagnóstico e ordem SDD

O formulário `/login` já chama `POST /api/auth/login`, mas persiste JWT em sessionStorage. A função HTTP só injeta Bearer quando solicitada; a busca não solicita autenticação. `lookup.route.ts` aplica apenas limite de requisições e permite acesso anônimo inclusive ao cache. O middleware aceita cabeçalho permissivo e payload sem validação de identidade.

Esta SPEC e o prompt da sessão devem ser commitados antes das alterações funcionais. Commits desta tarefa usam trailers Agent/Spec desta SPEC e a data/hora Git solicitada anteriormente (2026-10-05T23:44:57-03:00); a data real dos arquivos permanece 2026-10-06.

## 2. Contrato de autenticação

`POST /api/auth/login`, público, Content-Type application/json.

Request: `{ "email": "<email da conta>", "password": "<senha da conta>" }`.

- Email e senha devem ser strings não vazias; email normalizado por trim/lowercase. Limitar email a 254 e senha a 1024 caracteres, sem converter objetos/arrays para strings.
- 200: `{ "token": "<JWT>", "user": { "id": "<uuid>", "email": "<email normalizado>", "name": "<nome ou null>", "role": "analyst|viewer|admin" } }`.
- 400: corpo inválido, campos ausentes, não-string ou formato de email inválido; `{ "error": "<mensagem segura>" }`.
- 401: usuário inexistente ou senha incorreta; mesma mensagem `Invalid credentials`, sem distinguir as duas condições.
- 500: falha operacional; mensagem genérica sem dados internos/credenciais.
- Login/refresh enviam Cache-Control: no-store e Pragma: no-cache.
- JWT assinado somente com segredo de ambiente `JWT_SECRET`, HS256, validade de 24 horas, issuer `kapitrace`, audience `kapitrace-web`. Payload com id/email/role e iat/exp. Refresh preserva política de emissão; não muda modelo de refresh para cookie nem amplia RBAC.

## 3. Estado global e transporte

Usar estado global exclusivamente em memória, uma opção expressamente permitida pelo pedido. Um módulo client com token privado, subscription e hook de snapshot booleano guarda a sessão durante navegação Next. Não persistir o JWT em localStorage, sessionStorage, cookies legíveis por JS, URLs ou logs. Recarregar/fechar aba exige novo login. Memória reduz persistência, mas não torna o token imune a XSS ativo; nenhum segredo JWT privado é enviado ao navegador.

A função HTTP considera Auth público e Lookup/Watchlist/refresh protegidos por padrão. Antes da chamada protegida, exigir sessão e inserir `Authorization: Bearer <token>` com o token atual, substituindo qualquer header divergente fornecido pelo chamador. Sem sessão: não chamar backend; sinalizar erro de autenticação. Em 401: apagar sessão imediatamente e sinalizar expiração/invalidade; não apagar sessão em timeout, 429, 5xx ou demais falhas operacionais.

Login só salva resposta com token válido estruturalmente (string não vazia, tamanho limitado, formato de três partes). A validação criptográfica é exclusiva do backend. Erros de rede e JSON inválido exibem mensagens compreensíveis; loading desabilita submissões concorrentes. Sucesso redireciona para `/lookup`; erro permanece em `/login`. Logout limpa memória e eventuais tokens do armazenamento legado, sem registrar seus valores.

Um guard client nas páginas de Lookup e Watchlist oculta conteúdo protegido e redireciona para `/login` quando sem sessão ou após 401. O frontend é apenas UX: a autorização obrigatória fica no backend, inclusive para clientes fora da interface.

## 4. Middleware authenticate

Aplicar `router.use(authenticate)` em Lookup antes de limite/validação/cache/controller. Watchlist e refresh permanecem protegidos; login/register e health públicos.

- Cabeçalho deve seguir um único Bearer seguido de JWT, esquema case-insensitive, token limitado em tamanho. Basic, token cru, vazio ou múltiplos tokens são rejeitados.
- JWT.verify exige HS256, issuer/audience esperados e validade temporal. Rejeitar assinatura divergente, algoritmo alternativo/none, expiração e nbf no futuro.
- Após assinatura válida, exigir objeto com id/email/role strings e iat/exp finitos inteiros, exp > iat, exp-iat <= 86400 e papel permitido. Não aceitar payload string, identidade ausente, tokens sem expiração ou data de emissão futura.
- Ausente/malformado/expirado/inválido: 401, cabeçalho WWW-Authenticate: Bearer, corpo genérico sem token, segredo ou causa criptográfica interna; nunca executar next nem consultar banco/provedores.
- Válido: preencher req.user com identidade tipada e executar next exatamente uma vez. authorize permanece responsável por permissão de papel (403).
- A verificação é stateless: exclusão de conta não revoga automaticamente token já emitido; revogação centralizada fica fora deste escopo.

## 5. Cobertura obrigatória

Unitários: middleware isolado com request/response mínimos e JWTs gerados em runtime usando chave exclusivamente de teste; sucesso/next/req.user, falta de Bearer, tokens inválidos/tamper/expirados/nbf, algoritmo/issuer/audience incorretos, claims ausentes e payload string. Sem tokens serializados nas fixtures ou logs. Testes do estado em memória/cliente HTTP devem provar injeção, nenhuma chamada sem sessão, limpeza em 401 e retenção em falhas transitórias.

Integração: autenticação real register/login e erros 400/401, contrato/no-store e refresh. Lookup 401 sem token/inválido/expirado, inclusive cache HIT e input inválido; zero requests externos e nenhuma criação de cache não autorizada. Token válido obtido por login real permite MISS/HIT e mantém todos os testes existentes de resiliência/validação. Adaptar helpers com login explícito, nunca bypass automático ou remoção do middleware em teste.

E2E: Chrome/CDP já existente, sem nova biblioteca. Cadastro/login de conta temporária real; tentativa com senha errada e falha de rede exibidas; sucesso navega para busca, envia Bearer e retorna score/MISS/HIT; navegação Next preserva sessão e permite watchlist; recarga/logout removem sessão e redirecionam. Nenhum token em storage persistente. Interceptação de fornecedores segue somente no HTTP de testes; sem consumo de cotas reais.

Executar build backend, lint/build frontend e suíte completa. Não salvar JWTs/credenciais reais nas evidências.

## 6. README, métricas e sessão

Preservar URL pública clicável no topo, histórico de ferramentas/modelos e demais seções. Atualizar comportamento autenticado/estado em memória, contrato e exemplos de Bearer, removendo a descrição de Lookup público. Atualizar cloc real mantendo escopo com dependências >=100.000 linhas e contagem separada do projeto. Registrar prompt literal e saídas brutas de testes/build/lint em prompts/sessoes; declarar que não há exportação automática integral da plataforma.

JWT_SECRET continua obrigatório no ambiente, sem fallback fixo. .env e variantes seguem ignorados; exemplos sem segredos. Executar scanner de conteúdo Git antes de cada commit, sem imprimir valores.

Trailers de todo commit:

```text
Agent: Codex-GPT-6
Spec: SPEC/2026-10-06-auth-and-middleware-reactivation.md
```
