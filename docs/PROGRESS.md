# Progresso do projeto

## Módulo atual

Correções pós-MVP — telas pendentes, auditoria abrangente, importação/restauração e cobertura de testes.

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

## Último commit

`feat: add persistent light and dark theme`.

## Testes executados

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test` — 5 testes aprovados.
- `npm run build`

## Pendências conhecidas

- Telas completas para Agenda, Vendas, Assinaturas, Comissões, Usuários, Auditoria, Relatórios e Configurações.
- Importação CSV e restauração segura de backups.
- Auditoria para todas as mutações comerciais.
- Regras configuráveis de score por resposta, estornos, prazo de segurança e dashboards de comissão.
- Cobertura de testes de integração e testes de interface.

## Próximo módulo

Correções pós-MVP — priorizar agenda e vendas com interfaces completas.

## Decisões técnicas relevantes

- Monorepo npm com React/Vite, Express, Prisma e SQLite.
- Valores financeiros usam centavos inteiros; percentuais usam pontos-base.
- Tema claro/escuro é persistido em `localStorage`.
- Bancos SQLite, backups e variáveis locais não são versionados.
