# SPEC-2026-10-01: Threat Intelligence & Unified ThreatScore Engine

## 1. Visão Geral e Arquitetura

O **KapiTrace Threat Analyzer** é o subsistema central da plataforma KapiTrace encarregado de:
1. Validar e classificar rigorosamente os Indicadores de Comprometimento (IOCs) recebidos: endereços IP (IPv4 e IPv6), hashes criptográficos de artefatos maliciosos (MD5, SHA-1, SHA-256) e nomes de domínio totalmente qualificados (FQDNs segundo a RFC 1035).
2. Orquestrar a consulta a múltiplos feeds de inteligência de ameaças (AbuseIPDB, VirusTotal, Shodan, GreyNoise, AlienVault OTX, URLScan.io e IPInfo).
3. Calcular deterministicamente o **ThreatScore Unificado** através de um algoritmo de ponderação cumulativa normalizado no intervalo fechado de $[0, 100]$.
4. Gerenciar uma camada eficiente de cache local/banco de dados com controle de Time-To-Live (TTL) para mitigar exaustão de cotas de APIs externas e assegurar respostas sub-milissegundo para consultas repetidas.
5. Fornecer contratos de API RESTful consistentes para autenticação com tokens JWT, renovação de credenciais, consulta com discriminação explícita de origem (`cache` vs `api`) e gerenciamento de lista de monitoramento (Watchlist).

---

## 2. Validação Estrita de Entradas (IOCs)

Todas as requisições que processam indicadores devem passar por rotinas de sanitização e validação determinística antes de qualquer consulta a caches ou fontes externas. Entradas inválidas devem ser sumariamente rejeitadas com código HTTP `400 Bad Request`.

### 2.1 Endereços IP

#### IPv4 (Internet Protocol version 4)
- **Definição**: Notação de ponto decimal composta exatamente por 4 octetos numéricos inteiros: `d.d.d.d`.
- **Intervalo de Octeto**: Cada octeto $O_i \in [0, 255]$ ($0 \le O_i \le 255$).
- **Regras de Rejeição**:
  - Proibição de zeros à esquerda em octetos decimais (ex: `012.34.56.78` é rejeitado para prevenir ambiguidades de interpretação octal).
  - Rejeição de valores negativos ou superiores a 255.
  - Rejeição de separadores extras, espaços em branco no corpo da string ou caracteres não-dígito.
  - Detecção de blocos especiais: `127.0.0.1` (loopback), `0.0.0.0` (wildcard), RFC 1918 (privados: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), RFC 3927 (link-local: `169.254.0.0/16`), RFC 5771 (multicast: `224.0.0.0/4`).

#### IPv6 (Internet Protocol version 6 — RFC 4291 / RFC 5952)
- **Definição**: 8 grupos de 4 dígitos hexadecimais separados por dois pontos (`:`), variando de `0` a `ffff` por grupo.
- **Suporte a Notação Abreviada**:
  - Suporte ao operador de compressão de zeros consecutivos (`::`), permitido no máximo uma única vez na representação do endereço.
  - Suporte a supressão de zeros à esquerda em cada hexteto.
  - Suporte a representações dual-stack IPv4-mapeadas (ex: `::ffff:192.0.2.128`).
- **Regras de Rejeição**:
  - Múltiplas ocorrências de `::` na mesma string.
  - Grupos com mais de 4 caracteres hexadecimais.
  - Caracteres fora da base 16 (`[0-9a-fA-F]`).

### 2.2 Hashes Criptográficos
Os hashes identificam artefatos maliciosos e amostras de malware. Devem ser validados quanto ao tamanho exato e composição de caracteres hexadecimais (case-insensitive):

| Tipo de Hash | Tamanho em Bits | Comprimento (Hex Characters) | Expressão Regular Canônica |
| ------------ | --------------- | ---------------------------- | -------------------------- |
| **MD5**      | 128 bits        | 32 caracteres                | `^[a-fA-F0-9]{32}$`        |
| **SHA-1**    | 160 bits        | 40 caracteres                | `^[a-fA-F0-9]{40}$`        |
| **SHA-256**  | 256 bits        | 64 caracteres                | `^[a-fA-F0-9]{64}$`        |

- **Regras de Rejeição**:
  - Qualquer string que não coincida exatamente com o comprimento exigido ou que contenha caracteres não-hexadecimais (`g-z`, pontuações, caracteres de controle).

### 2.3 Nomes de Domínio (FQDN — RFC 1035 / RFC 1123)
- **Estrutura**: Sequência de rótulos (labels) separados por ponto final (`.`).
- **Restrições de Comprimento**:
  - Comprimento total do domínio $\le 253$ caracteres (incluindo separadores).
  - Cada rótulo individual deve conter entre 1 e 63 caracteres.
- **Conjunto de Caracteres Permitidos**:
  - Caracteres alfanuméricos ASCII (`a-z`, `A-Z`, `0-9`) e o hífen (`-`).
  - Um rótulo **nunca** pode iniciar ou terminar com um hífen (`-`).
  - O Top-Level Domain (TLD) final deve conter pelo menos 2 caracteres e consistir exclusivamente de letras (`[a-zA-Z]{2,}`).
  - Não são permitidos pontos duplos (`..`).
  - Nomes de domínio internacionalizados (IDN) com suporte a Punycode (`xn--`).

---

## 3. Algoritmo do ThreatScore Unificado

O **ThreatScore** consolida dados heterogêneos de reputação provenientes de diferentes sensores em uma pontuação contínua e determinística.

### 3.1 Definição Matemática
O cálculo da pontuação $S_{\text{raw}}$ é definido pela combinação linear ponderada de métricas normalizadas acrescida de modificadores contextuais de severidade:

$$S_{\text{raw}} = \sum_{i=1}^{n} \left( w_i \cdot M_i \right) + \sum_{k=1}^{m} B_k$$

Onde:
- $w_i \ge 0$ representa o peso de relevância da métrica $i$, com $\sum w_i = 1.0$.
- $M_i \in [0, 100]$ representa o valor normalizado da métrica $i$.
- $B_k \in \mathbb{R}$ representa penalidades aditivas por agravantes críticos (ex: presença em blacklists governamentais, servidores C2 confirmados, vulnerabilidades RCE exploradas).

### 3.2 Vetores de Métrica e Pesos Padrão
1. **$M_{\text{abuse}}$ — Abuse Confidence Index ($w_1 = 0.35$)**:
   - Fornecido pelo AbuseIPDB com base em frequência, frescor e diversidade de reportes de administradores de rede.
2. **$M_{\text{malicious}}$ — Taxa de Detecção Maliciosa ($w_2 = 0.40$)**:
   - Calculado como percentual de motores de segurança que classificam o artefato/host como malicioso (ex: VirusTotal engines positives / total engines $\times 100$).
3. **$M_{\text{exposure}}$ — Exposição de Serviços e Vulnerabilidades Críticas ($w_3 = 0.15$)**:
   - Avaliado via Shodan com base em portas abertas comumente visadas (22, 23, 445, 3389) e CVEs atribuídas com CVSS $\ge 7.0$.
4. **$M_{\text{activity}}$ — Classificação de Ruído e Atividade Não Solicitada ($w_4 = 0.10$)**:
   - Dados do GreyNoise categorizando tráfego como benigno/ruído (reduz pontuação) vs. exploração ativa direcionada (aumenta pontuação).

### 3.3 Modificadores Aditivos ($B_k$)
- Presença ativa em Feed de C2 / Botnet: $+25$ pontos.
- Certificado SSL expirado ou falso com spoofing de marca: $+15$ pontos.
- Host listado como Whitelisted / Conhecido Benigno (ex: DNS Google, Cloudflare, Root Servers): $-40$ pontos.

### 3.4 Normalização e Limites (Clamping)
O score final $S$ é rigorosamente limitado ao intervalo $[0, 100]$:

$$\text{ThreatScore} = \min\left(100, \max\left(0, \text{round}(S_{\text{raw}})\right)\right)$$

### 3.5 Tiers de Classificação de Risco

| Intervalo de Score | Nível de Risco | Rótulo (Severity) | Diretriz de Resposta a Incidentes |
| ------------------ | -------------- | ----------------- | --------------------------------- |
| **0 – 19**         | Muito Baixo    | `CLEAN` / `LOW`   | Indicador seguro, sem histórico de abuso recente. Nenhuma ação restritiva requerida. |
| **20 – 49**        | Moderado       | `SUSPICIOUS`      | Atividade de varredura ou comportamento anômalo leve. Recomendado monitoramento preventivo. |
| **50 – 79**        | Alto           | `HIGH`            | Evidências consistentes de ataques, spam ou vulnerabilidades expostas. Recomenda-se quarentena ou bloqueio em borda. |
| **80 – 100**       | Crítico        | `CRITICAL`        | Ameaça iminente comprovada (C2, malware distribuído, ransomware). Bloqueio imediato obrigatório. |

---

## 4. Contratos de API e Mecanismo de Cache

### 4.1 Autenticação (`/api/auth`)

#### `POST /api/auth/register`
- **Requisição**: `{ "email": "analyst@kapitrace.sec", "password": "StrongPassword123!", "name": "Security Analyst" }`
- **Validações**: E-mail válido, senha com complexidade mínima (mínimo 8 caracteres, letras maiúsculas, minúsculas, números e caracteres especiais).
- **Resposta Sucesso (201)**: `{ "message": "User created successfully", "userId": "<uuid>" }`
- **Resposta Erro (400)**: `{ "error": "User already exists" }` ou mensagens de validação.

#### `POST /api/auth/login`
- **Requisição**: `{ "email": "analyst@kapitrace.sec", "password": "StrongPassword123!" }`
- **Resposta Sucesso (200)**: `{ "token": "<jwt-token>", "user": { "id": "<uuid>", "email": "...", "role": "analyst" } }`
- **Resposta Erro (401)**: `{ "error": "Invalid credentials" }`

#### `POST /api/auth/refresh`
- **Headers**: `Authorization: Bearer <jwt-token>`
- **Resposta Sucesso (200)**: `{ "token": "<new-jwt-token>", "user": { "id": "...", "email": "...", "role": "..." } }`
- **Resposta Erro (401)**: `{ "error": "Token expired or invalid" }`

---

### 4.2 Lookup com Validação de Cache (`/api/lookup`)

#### `GET /api/lookup/ip/:ip` & `GET /api/lookup/:type/:indicator`
- **Tipos de Indicador Suportados**: `ip`, `domain`, `hash`.
- **Cabeçalho de Cache**:
  - `source: "cache"` indica um **Cache HIT** (registro encontrado em banco e dentro do período de validade do TTL).
  - `source: "api"` indica um **Cache MISS** (registro não existia no cache ou expirou por TTL, resultando em reavaliação completa e persistência no cache).
- **TTL Padrão**: 24 horas (86.400 segundos).
- **Formato da Resposta (200 OK)**:
  ```json
  {
    "source": "cache",
    "indicator": "198.51.100.1",
    "type": "ip",
    "threatScore": 78,
    "riskLevel": "HIGH",
    "cachedAt": "2026-10-01T15:30:00.000Z",
    "expiresAt": "2026-10-02T15:30:00.000Z",
    "details": {
      "abuseConfidenceScore": 82,
      "maliciousReportsCount": 24,
      "country": "US",
      "asn": "AS64512"
    }
  }
  ```
- **Formato de Erro de Validação (400 Bad Request)**:
  ```json
  {
    "error": "Validation Error",
    "message": "Invalid IPv4 address format. Octets must be between 0 and 255 without leading zeros.",
    "indicator": "999.12.34.56"
  }
  ```

---

### 4.3 CRUD de Watchlist (`/api/watchlist`)
Requer cabeçalho `Authorization: Bearer <token>`.

- **`GET /api/watchlist`**:
  - Retorna a coleção de itens monitorados do usuário autenticado.
- **`POST /api/watchlist`**:
  - Corpo: `{ "itemValue": "malicious-c2.net", "itemType": "domain" }`.
  - Valida o `itemType` e o `itemValue` com as rotinas estritas de IOC.
  - Retorna status `201 Created` com o objeto persistido.
- **`DELETE /api/watchlist/:id`**:
  - Remove o item com validação de posse (`userId == req.user.id`).
  - Retorna `200 OK` `{ "message": "Removed successfully" }`.

---

## 5. Estratégia de Cobertura de Testes

### 5.1 Testes Unitários (`tests/unit/`)
1. **`validators.test.ts`**:
   - Validação de IPv4: endereços válidos (classes A, B, C, limites 0.0.0.0 e 255.255.255.255), rejeição de octetos $\ge 256$, caracteres não numéricos, zeros à esquerda indevidos e formatos incompletos.
   - Validação de IPv6: representações completas de 8 grupos, formas abreviadas com `::`, rejeição de caracteres não-hex e duplicação inválida de `::`.
   - Validação de Hashes: MD5 (32 hex), SHA-1 (40 hex), SHA-256 (64 hex), rejeição de tamanhos incorretos (31, 33, 41, 65 chars) e caracteres fora de `[0-9a-fA-F]`.
   - Validação de Domínios: domínios simples, subdomínios aninhados, TLDs válidos, rejeição de hífens no início/fim de rótulo, rótulos $> 63$ chars e domínios $> 253$ chars.
2. **`threat-score.test.ts`**:
   - Cálculo exato para cada fator e peso isolado.
   - Ponderação com todos os fatores preenchidos.
   - Verificação de limites extremos (teto 100 e piso 0).
   - Verificação de atribuição dos níveis de severidade (`CLEAN`, `SUSPICIOUS`, `HIGH`, `CRITICAL`).

### 5.2 Testes de Integração (`tests/integration/`)
1. **`auth.test.ts`**:
   - Criação de novo usuário (`/api/auth/register`).
   - Autenticação bem-sucedida com retorno de JWT válido (`/api/auth/login`).
   - Rejeição de login com senha incorreta ou usuário inexistente.
   - Renovação de credenciais via `/api/auth/refresh`.
2. **`lookup.test.ts`**:
   - Primeira consulta de indicador resultando em `source: 'api'` (Cache MISS).
   - Segunda consulta do mesmo indicador retornando `source: 'cache'` (Cache HIT).
   - Rejeição de consultas com parâmetros maliciosos ou formatos inválidos.
3. **`watchlist.test.ts`**:
   - Adição de indicador à lista de monitoramento do usuário.
   - Recuperação da lista contendo o indicador criado.
   - Remoção do indicador da lista e confirmação da exclusão.
   - Bloqueio de acesso não autenticado com retorno HTTP `401 Unauthorized`.

### 5.3 Testes E2E (`tests/e2e/`)
1. **`workflow.test.ts`**:
   - Fluxo ponta a ponta: Cadastro $\rightarrow$ Login $\rightarrow$ Consulta de Ameaça de Alto Risco $\rightarrow$ Inclusão na Watchlist de Monitoramento $\rightarrow$ Inspeção da Watchlist $\rightarrow$ Limpeza de dados.

---

## 6. Governança, Rastreabilidade e Segurança

1. **Rastreabilidade de IA**:
   - Todas as sessões de instrução e prompt serão registradas em `prompts/sessoes/`.
2. **Segurança Máxima**:
   - Variáveis sensíveis e segredos são mantidos em arquivos de ambiente ignorados pelo Git (`.env`).
   - Bancos de dados locais SQLite (`*.db`) são estritamente excluídos do versionamento.
