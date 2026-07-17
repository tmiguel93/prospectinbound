# Progresso do projeto

## Módulo atual

Módulo 1 — Banco e autenticação (em andamento)

## Módulos concluídos

- Módulo 0 — Inicialização.

## Último commit

`chore: initialize local crm workspace`.

## Testes executados

- `npm run lint`
- `npm run typecheck`
- `npm run test` (1 teste da API aprovado)
- `npm run build`

## Pendências conhecidas

Os scripts de seed, studio e backup ainda são marcadores até os módulos responsáveis.

## Próximo módulo

Módulo 1 — Banco SQLite, Prisma e autenticação local.

## Decisões técnicas relevantes

- Monorepo com npm workspaces.
- API Express e frontend React/Vite em TypeScript.
- Banco de dados e autenticação serão introduzidos apenas no Módulo 1.
- O build de produção serve o frontend pela API Express.
