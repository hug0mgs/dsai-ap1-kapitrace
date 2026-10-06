# SPEC — Integração real de Threat Intelligence

Data: 2026-10-06
Status: especificação aprovada para implementação pela solicitação do usuário; implementação pendente.
Agente: Codex (GPT-6)

## 1. Escopo e precedência

Esta SPEC complementa `SPEC/2026-10-01-threat-analyzer.md` e substitui a simulação de reputação no Lookup. Preservar Express/TypeScript, módulos existentes, Prisma e contratos de Auth/Watchlist. O datasource atual é SQLite; não migrar banco incidentalmente. Nesta etapa inicial, apenas inspecionar, especificar e commitar a SPEC, antes de qualquer mudança funcional. Implementação e respectivos testes serão commits posteriores com os mesmos trailers.

## 2. Diagnóstico observado

- `src/backend/src/modules/lookup/lookup.controller.ts`: `deriveThreatFactors` fabrica fatores a partir de palavras e seeds. `lookupIp` também fabrica ASN, país e organização. Ambas as rotas retornam `source: api` sem consultar fornecedores.
- `src/backend/src/modules/threat-analyzer/threat-score.service.ts`: função pura existente, pesos 0,35/0,40/0,15/0,10; modificadores adicionais e confiança por contagem. Ausência de métrica hoje equivale a zero.
- `src/frontend/src/app/lookup/page.tsx`: `mockResults`, fallback silencioso após erro HTTP, fontes/detalhes fictícios, localhost fixo e ações de watchlist sem implementação.
- `src/frontend/src/app/dashboard/page.tsx`: estatísticas, feed, consultas e pontos do mapa estáticos. Remover ou identificar como demonstrativos até existir contrato real; não apresentá-los como telemetria de fornecedores.
- Cache: `IpCache`, `DomainCache`, `HashCache`, JSON em `data`, `updatedAt`, TTL fixo de 24 horas. Cache legado pode conter simulação e precisa ser invalidado por versão.
- `tests/e2e/workflow.test.ts` cobre fluxo HTTP; não valida interface em navegador.
- `.gitignore` cobre alguns arquivos de ambiente, mas não todas as variantes. `.env.example` e Auth possuem segredo JWT demonstrativo/fallback: substituir por configuração obrigatória, nunca por segredo operacional versionado.

## 3. Serviços e credenciais

Consultas HTTPS somente a hosts fixos dos fornecedores, via adaptadores backend; nunca navegar ao IOC recebido. Apenas leitura de relatórios existentes: sem upload, submissão de URL ou varredura ativa.

| Serviço | Indicadores | Consulta planejada | Variável | Autenticação |
| --- | --- | --- | --- | --- |
| AbuseIPDB v2 | IPv4/IPv6 | GET https://api.abuseipdb.com/api/v2/check, ipAddress, maxAgeInDays=90 | ABUSEIPDB_API_KEY | header Key |
| VirusTotal v3 | IP/domínio/hash | GET https://www.virustotal.com/api/v3/ip_addresses/{ip}, /domains/{domain}, /files/{hash} | VIRUSTOTAL_API_KEY | header x-apikey |
| Shodan | IP suportado pelo plano | GET https://api.shodan.io/shodan/host/{ip} | SHODAN_API_KEY | query key (obrigatoriamente removida dos logs) |
| GreyNoise Community | IPv4 | GET https://api.greynoise.io/v3/community/{ip} | GREYNOISE_API_KEY | header key |
| AlienVault OTX | IPv4/IPv6/domínio/hash | GET https://otx.alienvault.com/api/v1/indicators/{IPv4,IPv6,domain,file}/{ioc}/general | OTX_API_KEY | header X-OTX-API-KEY |
| URLScan.io | domínio | GET https://urlscan.io/api/v1/search/, query de domínio exato | URLSCAN_API_KEY | header API-Key |
| IPInfo | IP | GET https://ipinfo.io/{ip}/json | IPINFO_TOKEN | Bearer token |

Chave vazia desabilita o provedor explicitamente (`not_configured`); não inventar dados. GreyNoise IPv6 será `not_applicable`. Recursos não liberados pelo plano devem ser `unavailable`, não limpos. Validar contratos vigentes de GreyNoise, OTX, URLScan e IPInfo nas respectivas documentações antes de implementar; usar endpoints compatíveis com o plano de cada conta. Não fixar cotas comerciais do README como garantia operacional.

Referências verificadas para o desenho: https://docs.abuseipdb.com/, https://docs.virustotal.com/reference/ip-info, https://docs.virustotal.com/reference/files, https://developer.shodan.io/api. Demais referências de validação: https://docs.greynoise.io/, https://otx.alienvault.com/api, https://urlscan.io/docs/api/, https://ipinfo.io/developers.

Configuração adicional: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `EXTERNAL_API_TIMEOUT_MS` (5000), `LOOKUP_DEADLINE_MS` (10000), `LOOKUP_CACHE_TTL_SECONDS` (86400), `LOOKUP_PARTIAL_CACHE_TTL_SECONDS` (300), `LOOKUP_STALE_MAX_AGE_SECONDS` (172800), `EXTERNAL_API_MAX_RETRIES` (1), `NEXT_PUBLIC_API_BASE_URL` (apenas URL pública do backend). Validar números positivos e limites razoáveis no startup. Carregar dotenv antes de módulos que leem ambiente. Não adicionar qualquer chave a variáveis NEXT_PUBLIC.

## 4. Arquitetura, validação e normalização

Consolidar as rotas IP e genérica em uma única orquestração para evitar divergência. Adaptadores retornam dados tipados e sanitizados; serviço agregador produz fatores, evidências e estados por fonte; controller valida, consulta cache e responde. Preservar função pura de cálculo, sem HTTP dentro dela.

- Rejeitar tipo desconhecido com 400; não autodetectar silenciosamente um tipo inválido.
- Validar IPv4/IPv6, hashes MD5/SHA1/SHA256 hexadecimais e domínio com labels RFC 1035/1123; rejeitar controles, URLs, portas e credenciais embutidas.
- Normalizar caixa de domínios/hashes, espaços externos e IPv6 para chave canônica única. IDN somente por conversão explícita para ASCII e nova validação; não aceitar Unicode arbitrário.
- Bloquear consulta externa de IPs privados, loopback, link-local, multicast, não especificados e IPv4 mapeados equivalentes; exibir erro claro. Fixtures HTTP podem usar IP público conhecido sem tráfego externo.
- Escapar segmentos e parâmetros com APIs de URL; não concatenar entrada em uma URL arbitrária, não seguir redirects para hosts não permitidos.

## 5. ThreatScore baseado em evidências

Manter pesos e tiers existentes (LOW 0–19, SUSPICIOUS 20–49, HIGH 50–79, CRITICAL 80–100), com revisão explícita de métricas faltantes:

1. Abuse: `data.abuseConfidenceScore`; reports em `totalReports` são contexto, não fator extra.
2. VirusTotal: `last_analysis_stats.malicious / soma das contagens válidas de last_analysis_stats * 100`. Denominador zero significa métrica ausente; nunca dividir por zero.
3. Shodan: exposição = min(100, 10 por porta distinta entre 22/23/445/3389 + 20 por CVE distinta com CVSS >= 7 comprovado). CVE sem severidade não presume CVSS crítico. Portas abertas não comprovam ataque.
4. GreyNoise: classification malicious = 100, benign = 0; unknown ou classificação ausente = métrica ausente. Não inferir benignidade de `noise: false`.
5. OTX: pulsos gerais são contexto. Não ativar C2/botnet apenas por haver pulsos ou palavras no IOC. Modificador somente quando houver evidência estruturada verificável e documentada; se indisponível, omitir.
6. URLScan: busca só enriquece contexto. Modificador phishing somente com verdict explícito no relatório associado ao domínio exato, nunca pela existência de resultado.
7. IPInfo: localização/ASN/organização não alteram score; infraestrutura de nuvem não implica benignidade.

Somar apenas métricas finitas disponíveis e renormalizar seus pesos: base = soma(w*m)/soma(w disponível). Aplicar modificadores existentes apenas com evidência explícita, arredondar e limitar a [0,100]. Sem qualquer métrica válida: threatScore/riskLevel/analysis nulos e `assessmentStatus: insufficient_data`; nunca produzir LOW por falha ou 404. Confiança = cobertura ponderada (soma dos pesos disponíveis / soma dos pesos aplicáveis ao tipo * 100), acompanhada de fontes disponíveis; não cresce por modificadores. Domínio/hash usam VirusTotal como métrica aplicável; IP usa os quatro fatores. Registrar `scoreVersion: real-api-v1` e fórmula no breakdown.

Exemplo de aceite: abuse=80, VT=50, outras métricas ausentes: round((0,35*80+0,40*50)/0,75)=64, HIGH. Apenas VT=80 para hash: score=80, CRITICAL. Timeout de todos não gera score zero.

## 6. Resiliência e cotas

Executar adaptadores independentes concorrentemente, com limite global de trabalho e deadline total; falha de uma fonte não derruba as demais. AbortController/cancelamento efetivo, limites de resposta e validação de JSON/esquema. Classificar estados: ok, not_found, not_configured, not_applicable, rate_limited, timeout, unavailable, invalid_response.

Retry no máximo uma vez para falha transitória de rede ou 502/503/504, com backoff e jitter, dentro do deadline. Não repetir 400/401/403/404. Em 429, respeitar Retry-After (segundos ou data), armazenar cooldown por fornecedor e responder parcialmente; nunca aguardar um cooldown longo dentro do request. Aplicar também cooldown/rate limiter às consultas concorrentes e retorno de 503. Limites configuráveis por plano, sem filas ilimitadas. Logs só com fornecedor, categoria, status e duração; nunca objeto bruto de erro Axios, headers, URLs autenticadas, corpo completo ou ambiente.

## 7. Lookup, cache e fallback

Preservar top-level `source`, `indicator`, `type`, `threatScore`, `riskLevel`, `data`, `analysis`; incluir `cachedAt`, `expiresAt`, `stale`, `partial`, `assessmentStatus`, `scoreVersion` e estados por fonte. HIT/MISS devem retornar a mesma estrutura de análise. Não expor payloads brutos ou metadados sensíveis do fornecedor.

- HIT: versão real-api-v1 e expiresAt no futuro; `source: cache`, nenhuma chamada externa.
- MISS/expirado: consulta real; sucesso completo cacheado por 24h, parcial com métrica válida por 5min. Armazenar expiresAt dentro do JSON existente para TTL diferenciado sem exigir mudança de schema.
- Coalescer consultas simultâneas por tipo/IOC (single-flight); liberar registro em finally, inclusive quando há erro. Limitação por processo deve ser documentada; implantação com múltiplas instâncias requer coordenação compartilhada.
- Cache legado sem versão nunca pode ser usado, nem como stale. JSON corrompido é MISS.
- Falha total: servir apenas último resultado real com score, idade <= 48h desde coleta, como `source: cache`, `stale: true`, `partial: true`; preservar timestamps, incluir motivo sanitizado, não renovar validade nem sobrescrever esse registro.
- Sem cache válido: 503 para fontes indisponíveis ou não configuradas, Retry-After quando apropriado. Quando há consultas válidas mas apenas not_found/contexto, 200 com score nulo e insufficient_data, sem cache longo e sem classificação limpa.
- Falha de banco permanece erro operacional explícito; não se disfarça de falha do fornecedor.

## 8. Interface, Auth e Watchlist

Remover fallback mockado; loading, erro, resultado parcial, ausência de evidência e stale devem ser visíveis. Renderizar score do campo top-level e fontes reais, usar base URL configurável e encodeURIComponent. Email não faz parte do contrato real desta migração: desabilitar busca com explicação até SPEC específica, sem simular suporte.

Integrar adicionar/listar/remover watchlist à API existente com sessão real e checagem de posse, sem token fictício. Garantir que JWT_SECRET seja exigido fora dos testes, sem fallback fixo. Não ampliar privilégios/RBAC incidentalmente. Consultas públicas existentes precisam limite de entrada para impedir abuso de cotas. Ler `src/frontend/AGENTS.md` antes de alterações de frontend.

## 9. Testes e aceite

- Unitários: adapters com fixtures sanitizadas de esquemas reais; valores ausentes, NaN/infinito, denominator zero, renormalização, confiança, clamping, tiers, modificadores com evidência. IPv4/IPv6, canonicalização, hashes e labels/tamanho RFC, inputs maliciosos e IPs especiais.
- Integração: Auth register/login/refresh e Watchlist posse/CRUD; Lookup MISS/HIT/expiração/stale/versão/corrupção, concorrência, ausência de chaves, 404/429/Retry-After/401/5xx/timeout/JSON inválido. Interceptar somente HTTP dos fornecedores, mantendo app, orquestração e banco reais. Afirmar contagem de requests e zero chamadas no HIT.
- CI: bloquear egress de fornecedor não interceptado; credenciais falsas exclusivamente em testes; fixtures/VCR sem headers autenticados ou segredos. Relógio controlado para TTL/backoff sem esperas longas.
- E2E: navegador real para cadastro/login, busca, exibição de fontes/score, HIT, erro visível, adicionar/listar/remover watchlist. HTTP externo interceptado no ambiente de teste; manter suíte HTTP existente como integração.
- Executar build TypeScript e suítes pertinentes; documentar comandos e resultados. Testes ao vivo são opcionais fora de CI, nunca necessários para reproduzir a suíte.

## 10. Segurança, README, sessões e Git

Ampliar ignore para `.env` e `.env.*` em qualquer nível, preservando `.env.example`. Exemplos apenas com campos vazios/placeholders, JWT sem segredo utilizável. Não ler/imprimir arquivos de credenciais existentes. Validar arquivos staged por segredos antes de cada commit. Chaves pertencem às contas do operador e entram no ambiente local/deploy; não solicitar sua postagem em conversa.

Preservar README, link público já no topo e histórico de ferramentas; acrescentar Codex/GPT-6 com papel observado. Corrigir indicação de integrações ainda não implementadas e SQLite atual. Regenerar cloc com comando e escopo explícitos. O relatório existente diz 3.700.212 linhas, porém não declara comando/escopo e cloc não está instalado nesta inspeção. Reportar código próprio separado das dependências; se um relatório abrangente com dependências realmente superar 100.000 linhas, identificá-lo como tal. Não inventar linhas, inflar código ou atribuir dependências ao código autoral para atingir o requisito. Caso os arquivos disponíveis não atinjam o mínimo, registrar honestamente a limitação.

Guardar prompts e mensagens disponíveis em `prompts/sessoes/`, com limite de exportação declarado; nunca afirmar acesso a transcrições ocultas nem registrar segredos. Esta sessão deve ter registro antes da implementação. Não registrar raciocínio privado ou instruções internas.

Primeiro commit exclusivamente de SPEC e registro da sessão. Todo commit desta tarefa termina com:

```text
Agent: Codex-GPT-6
Spec: SPEC/2026-10-06-real-api-integration.md
```

Critério de passagem desta etapa: commit da SPEC confirmado por hash, nenhum arquivo funcional alterado. Implementação posterior sempre referencia este commit e SPEC.
