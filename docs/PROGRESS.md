# Progresso do projeto

## Módulo atual

Módulo 35 — Resultado de lead no Kanban (concluído).

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
- Módulo 15 — Backups: listagem, criação e restauração protegida.
- Módulo 16 — Usuários: criação, papéis e ativação/desativação protegida.
- Módulo 17 — Auditoria: filtros, paginação e cobertura de eventos comerciais.
- Módulo 18 — Agenda: responsável e reagendamento com validação de conflito.
- Módulo 19 — Vendas: alteração de plano e cancelamento de assinatura.
- Módulo 20 — Pipelines e assinaturas: telas operacionais conectadas aos dados locais.
- Módulo 21 — Dashboard com dados reais e relatórios comerciais.
- Módulo 22 — Revisão de contraste para tema claro/escuro e validação global.
- Módulo 23 — Relatórios com filtro de período e validação de intervalo.
- Módulo 24 — Suíte automatizada isolada da base local de operação.
- Módulo 25 — Navegação visual agrupada, ícones e Kanban por produto com arrastar e soltar.
- Módulo 26 — Limpeza de dados sintéticos, parceiro comercial completo e acesso direto ao Pipeline/Kanban.
- Módulo 27 — Contêiner Docker da aplicação, volumes persistentes, usuário sem privilégios e healthcheck.
- Módulo 28 — Helmet, CORS restrito em produção, limite de payload, segredo JWT robusto e dependências corrigidas.
- Módulo 29 — Stack Docker PostgreSQL, schema Prisma derivado e roteiro de migração segura do SQLite.
- Módulo 30 — Webhook assinado, envio oficial pela Meta, status de entrega e histórico de mensagens por lead.
- Módulo 31 — Chat interno persistente, central de conversas por lead e seletor seguro de canal WhatsApp.
- Módulo 32 — CI no GitHub, auditoria de dependências e bootstrap do banco de testes em ambiente limpo.
- Módulo 33 — Proxy reverso Nginx, cabeçalhos de borda e limite de payload na infraestrutura Docker.
- Módulo 34 — Layout responsivo, menu lateral retrátil persistente, navegação móvel com sobreposição e ajustes da central de conversas.
- Módulo 35 — Ações flutuantes de ganho/perda no Kanban, reversão segura e auditoria do resultado sem alterar a etapa do lead.

## Último commit

`feat: add lead outcomes from kanban`.

## Testes executados

- `npx prettier --check` nos arquivos do módulo
- `npx eslint apps packages scripts --max-warnings=0`
- `npm run typecheck`
- `npm run test` — 10 testes aprovados.
- `npm run build`

## Pendências conhecidas

As lacunas pós-MVP foram convertidas em módulos sequenciais e serão tratadas sem misturar escopos.

## Próximo módulo

Próxima evolução: migrações PostgreSQL versionadas e teste E2E visual.

## Decisões técnicas relevantes

- Monorepo npm com React/Vite, Express, Prisma e SQLite.
- Valores financeiros usam centavos inteiros; percentuais usam pontos-base.
- Tema claro/escuro é persistido em `localStorage`.
- Bancos SQLite, backups e variáveis locais não são versionados.
- A execução em Docker usa volumes nomeados para banco e backups, e não inclui arquivos `.env` na imagem.
