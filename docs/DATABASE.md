# Banco de dados

O banco SQLite local é `data/crm-local.db` e nunca deve ser versionado. O schema Prisma está em `apps/api/schema.prisma`; a migration inicial cria a tabela `User`.

O instalador cria o arquivo SQLite vazio, executa `npm run db:migrate` e aplica `npm run db:seed`. A primeira conta é criada pela interface, não por seed.

Parceiros, produtos, planos, regras de comissão, pipelines e etapas são relacionamentos normalizados. Preços e comissões fixas usam inteiros em centavos; percentuais recorrentes usam pontos-base (10% = 1000).
