# Base PostgreSQL

O SQLite continua sendo o modo local simples, enquanto `compose.postgres.yaml` oferece uma base PostgreSQL isolada e persistente para homologação e produção. A aplicação e o banco são iniciados juntos; o schema é derivado da mesma definição Prisma usada pelo CRM, eliminando divergência funcional entre os dois modos.

## Subida

1. Copie `.env.postgres.example` para `.env.postgres` e substitua as duas chaves por valores privados e longos.
2. Execute:

```powershell
docker compose --env-file .env.postgres -f compose.postgres.yaml up --build -d
```

O CRM fica disponível em `http://localhost:3002` e o PostgreSQL não é exposto para a rede do computador. A porta do CRM também fica vinculada ao próprio computador; para acesso externo, use um proxy com TLS. Os dados ficam nos volumes `postgres_data` e `postgres_backups`. A tela de backups usa `pg_dump` para criar arquivos `.dump` e `pg_restore` para restaurá-los, sempre criando uma cópia de emergência antes da troca.

## Migração segura do SQLite

Não aponte um banco PostgreSQL para o arquivo SQLite nem altere `DATABASE_URL` em uma instalação existente sem exportar e validar os dados. O caminho recomendado é:

1. criar um backup no CRM SQLite;
2. iniciar o stack PostgreSQL vazio;
3. importar os dados pelo fluxo de importação validada, começando por parceiros, produtos e planos, depois leads e histórico;
4. conferir totais, vendas, assinaturas e comissões antes do corte;
5. manter o SQLite como backup até a conferência operacional.

O bootstrap usa `prisma db push` apenas para criar um banco PostgreSQL vazio de forma idempotente. Antes de uma operação multiusuário definitiva, o próximo módulo substitui esse bootstrap por migrações versionadas e adiciona a rotina de exportação/importação completa.
