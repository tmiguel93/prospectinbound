# Progresso do projeto

## Módulo atual

Módulo 2 — Layout e dashboard base (a iniciar)

## Módulos concluídos

- Módulo 0 — Inicialização.
- Módulo 1 — Banco e autenticação.

## Último commit

`feat: add database schema and local authentication`.

## Testes executados

- Módulo 0: `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
- Módulo 1: `npm run lint`, `npm run typecheck`, `npm run test` (3 testes aprovados) e `npm run build`.

## Pendências conhecidas

Os scripts de seed e backup ainda são marcadores até os módulos responsáveis. O banco SQLite precisa ser criado pelo instalador antes da primeira migration.

## Próximo módulo

Módulo 2 — Layout, navegação e dashboard base.

## Decisões técnicas relevantes

- Monorepo com npm workspaces.
- API Express e frontend React/Vite em TypeScript.
- O build de produção serve o frontend pela API Express.
- O Prisma usa SQLite e migrations versionadas; o primeiro administrador é criado pela interface.
