# Sessão — Login e middleware — 2026-10-06

Agente: Codex (GPT-6)
SPEC: SPEC/2026-10-06-auth-and-middleware-reactivation.md

Registro das mensagens disponíveis e resultados desta tarefa. Não há acesso à exportação integral automática da plataforma; não registrar raciocínio interno, segredos ou JWTs emitidos. Prompt literal em arquivo separado. Inspeção: login existente usa sessionStorage; Lookup público e busca sem Bearer. Escolha: estado global somente em memória, conforme opção permitida pelo usuário. Nenhuma biblioteca nova. SPEC commitada antes de alterações funcionais.

## Mensagens literais do assistente

Vou revisar o login e a passagem do JWT, commitar a SPEC de autenticação antes das mudanças funcionais e então proteger o Lookup e adaptar os testes.

O login já chama o backend, mas o Lookup ainda está público e a busca não envia o JWT. Vou usar estado global em memória, uma das opções permitidas, e exigir autenticação antes de acessar cache ou APIs. Com essa escolha, recarregar a página exigirá novo login.
