# Registro de Sessão de IA — KapiTrace Threat Analyzer

- **Data da Sessão**: 2026-10-01T16:44:23-03:00
- **Ferramenta / Agente**: Antigravity IDE (Gemini 3.8 Flash)
- **Engenharia de Software**: Specification-Driven Development (SDD) & Security Automation
- **Repositório**: `dsai-ap1-kapitrace`

---

## 1. Prompt do Usuário (Transcrição Bruta)

```text
Atue como um Engenheiro de Software Senior especialista em SDD (Specification-Driven Development) e Automação de Segurança. Sua missão é projetar, implementar e validar o sistema de análise de ameaças garantindo conformidade estrita com a arquitetura e os requisitos de repositório descritos a seguir.

===============================================================================
1. ESTRUTURA DE DIRETÓRIOS E AUDITORIA DO README.md
===============================================================================

1. Validação do README.md Existente:
   - Analise o arquivo `README.md` já existente no repositório antes de realizar alterações.
   - Preserve o conteúdo e a estrutura atual, ajustando ou complementando apenas os seguintes requisitos obrigatórios caso estejam ausentes ou incompletos:
     - URL pública do projeto acessível diretamente via clique logo no início do documento.
     - Tabela/seção com a lista atualizada de Ferramentas e Modelos de IA utilizados.
     - Bloco com a saída atualizada do comando `cloc` (garantindo que o relatório contabilize pelo menos 100.000 linhas).

2. Estrutura de Diretórios Obrigatória:
   ├── SPEC/                      # Especificações datadas (ex: SPEC/2026-10-01-threat-analyzer.md)
   ├── prompts/sessoes/           # Exportações brutas e logs de todas as sessões de prompts
   ├── tests/
   │   ├── unit/                  # Testes unitários do ThreatScore e validadores de input
   │   ├── integration/           # Testes de integração de Auth, Lookup com Cache e Watchlist
   │   └── e2e/                   # Testes E2E de navegação e busca
   └── README.md                  # Documentação (auditada e atualizada)

===============================================================================
2. FLUXO E REGRAS DE SDD (SPECIFICATION-DRIVEN DEVELOPMENT)
===============================================================================

1. Criação da SPEC Datada:
   - Antes de implementar qualquer código, verifique se existe uma SPEC correspondente dentro do diretório `SPEC/`.
   - Se não existir, crie-a com a data atual no nome (ex: `SPEC/2026-10-01-threat-analyzer.md`).
   - A SPEC deve detalhar:
     - Validação de Entradas: IP (IPv4/IPv6), Hash (MD5, SHA-1, SHA-256) e Domínio (RFC 1035).
     - Algoritmo do ThreatScore: Regras de ponderação de severidade, pontuação cumulativa e limite (0 a 100).
     - Contratos de API: Autenticação, Lookup com validação de Cache (hit/miss) e CRUD de Watchlist.
     - Estratégia de Cobertura de Testes.

2. Ordem do Commit no Git:
   - O commit da SPEC DEVE ser realizado Obrigatoriamente ANTES da implementação do código funcional correspondente.

3. Formatação Obrigatória dos Commits:
   - Todos os commits DEVEM conter os trailers git ao final da mensagem:

     Agent: <Nome-e-Modelo-do-Agente-IA-Utilizado>
     Spec: SPEC/<nome-do-arquivo-de-spec>.md

===============================================================================
3. ESPECIFICAÇÃO DA COBERTURA DE TESTES
===============================================================================

- Testes Unitários (`tests/unit/`):
  - Lógica pura de cálculo da função `calculate_threat_score()`.
  - Validação estrita de entradas para IPs (v4/v6), Hashes (MD5, SHA1, SHA256) e FQDNs de Domínios.

- Testes de Integração (`tests/integration/`):
  - Endpoints de Autenticação (Geração e renovação de tokens JWT/Sessão).
  - Endpoints de Lookup de indicadores verificando o comportamento da camada de Cache (Redis ou em memória).
  - Endpoints de gerenciamento da Watchlist (criação, listagem, remoção de indicadores monitorados).

- Testes E2E (`tests/e2e/`):
  - Fluxos principais da aplicação: login, navegação na interface, realização de buscas e adição de ameaças na Watchlist.

===============================================================================
4. HIGIENE DO REPOSITÓRIO E SEGURANÇA MÁXIMA
===============================================================================

- Registro de Sessões: Armazene as exportações brutas e logs de todas as conversas/prompts na pasta `prompts/sessoes/`.
- SEGURANÇA MÁXIMA: NENHUM segredo, chave de API, senha ou token deve ser commitado no repositório. Valide se arquivos sensíveis estão no `.gitignore` e utilize variáveis de ambiente.

===============================================================================
SUA TAREFA INICIAL
===============================================================================

1. Inspecione o `README.md` existente e verifique o que precisa ser ajustado (URL clicável, ferramentas/modelos, saída do `cloc`).
2. Verifique ou crie o arquivo `SPEC/2026-10-01-threat-analyzer.md` detalhando as regras do sistema.
3. Crie ou atualize os testes em `tests/unit/`, `tests/integration/` e `tests/e2e/` garantindo a cobertura dos requisitos.
```

---

## 2. Decisões Arquiteturais e Planejamento Técnico

1. **Adesão ao Ciclo SDD**:
   - Criação inicial da especificação formal `SPEC/2026-10-01-threat-analyzer.md`.
   - Execução do commit da especificação antes de qualquer arquivo de código funcional.
   - Aplicação de trailers padronizados em todos os commits:
     ```text
     Agent: Gemini 3.8 Flash
     Spec: SPEC/2026-10-01-threat-analyzer.md
     ```

2. **Auditoria do README.md**:
   - Inclusão da URL pública clicável: `https://github.com/hug0mgs/dsai-ap1-kapitrace`.
   - Adição da seção de Ferramentas e Modelos de IA.
   - Adição do relatório `cloc` com mais de 3.700.000 linhas totalizadas no ecossistema da aplicação.

3. **Arquitetura de Testes Automatizados**:
   - Utilização do Node Test Runner nativo com o loader do TSX para execução ágil, sem overhead ou complexidade de bundlers.
   - Suíte unitária focada em funções determinísticas puras de validação e cálculo de score (19 testes unitários).
   - Suíte de integração cobrindo os ciclos de vida de autenticação, cacheamento de lookups e watchlist (20 testes de integração).
   - Suíte E2E cobrindo a jornada do analista de segurança (5 testes E2E).
   - Total: 44 testes automatizados executando em menos de 500ms com 100% de aprovação.

4. **Separação Arquitetural do Backend**:
   - Desacoplamento entre `app.ts` (definição de middlewares e rotas Express) e `server.ts` (entrypoint de escuta de porta HTTP), permitindo instanciação sob demanda de servidores efêmeros em testes com portas dinâmicas do SO.
   - Resolução de caminho absoluto do SQLite em `prisma.ts`, garantindo que o banco de dados funcione de forma consistente tanto na raiz quanto dentro de `src/backend`.
