# Arquitetura

O CRM é um monorepo npm com uma API Express, um frontend React/Vite e um pacote compartilhado de tipos e schemas.

A API organiza cada domínio em rotas, schemas e serviços. O Módulo 1 adiciona Prisma com SQLite local e o domínio de autenticação. O frontend acessa a API pelo mesmo host em produção e pelo proxy do Vite em desenvolvimento.
