# Banco de dados

O banco SQLite local é `data/crm-local.db` e nunca deve ser versionado. O schema Prisma está em `apps/api/schema.prisma`; a migration inicial cria a tabela `User`.

O instalador cria o arquivo SQLite vazio e executa `npm run db:migrate`. A primeira conta é criada pela interface, não por seed.
