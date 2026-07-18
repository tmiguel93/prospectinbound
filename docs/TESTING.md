# Testes

Use `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` antes de cada commit. O Módulo 1 cobre a rota `GET /health`, criação do primeiro administrador, senha com hash, login, logout e proteção da rota de perfil.

## Isolamento do banco de testes

`npm run test` clona `data/crm-local.db` para `data/crm-test.db` e executa a suíte exclusivamente nessa cópia, definida em `.env.test`. A base usada pela aplicação local não é alterada pelos testes.
