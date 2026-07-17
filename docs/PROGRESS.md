# Progresso do projeto

## Módulo atual

Módulo 15 — Backups: restauração segura e interface de operação (em andamento).

## Módulos concluídos

- Módulo 0 — Inicialização.
- Módulo 1 — Banco e autenticação local.
- Módulo 2 — Layout e dashboard base.
- Módulo 3 — Parceiros, produtos, planos e pipelines.
- Módulo 4 — Leads e Kanban.
- Módulo 5 — Qualificação e score.
- Módulo 6 — Agenda.
- Módulo 7 — Vendas, assinaturas e pagamentos.
- Módulo 8 — Motor de comissões.
- Módulo 9 — Usuários, permissões e auditoria.
- Módulo 10 — Exportação CSV e backups locais.
- Módulo 11 — Validação automatizada do MVP.
- Módulo 12 — Documentação final e revisão global.
- Módulo 13 — Operação de comissões: painel, pagamento e estorno.
- Módulo 14 — Importação CSV: prévia, mapeamento, validação e relatório de duplicidades.

## Último commit

`feat: add CSV lead import workflow`.

## Testes executados

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test` — 7 testes aprovados.
- `npm run build`

## Pendências conhecidas

As lacunas pós-MVP foram convertidas em módulos sequenciais e serão tratadas sem misturar escopos.

## Próximo módulo

Módulo 15 — Backups: restauração segura e interface de operação.

## Decisões técnicas relevantes

- Monorepo npm com React/Vite, Express, Prisma e SQLite.
- Valores financeiros usam centavos inteiros; percentuais usam pontos-base.
- Tema claro/escuro é persistido em `localStorage`.
- Bancos SQLite, backups e variáveis locais não são versionados.
