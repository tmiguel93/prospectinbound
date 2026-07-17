# ProspectInbound CRM

CRM local para prospecção comercial de produtos SaaS, desenvolvido em módulos sequenciais.

## Requisitos

- Node.js 22 LTS ou superior
- Windows 10/11 (para os scripts incluídos)

## Início rápido

1. Execute `setup-local.bat` ou `setup-local.ps1`.
2. Execute `start-local.bat` ou `start-local.ps1`.
3. Abra `http://localhost:3000`.

Na primeira execução, a página exibirá o formulário para criar o administrador local. A senha é armazenada somente como hash seguro.

Durante o desenvolvimento, use `npm run dev`. A rota de verificação da API é `GET /health`.

## Comandos

| Comando              | Finalidade                                |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Inicia API e frontend em desenvolvimento. |
| `npm run build`      | Compila todos os workspaces.              |
| `npm run start`      | Inicia a versão compilada.                |
| `npm run lint`       | Executa o lint.                           |
| `npm run typecheck`  | Verifica os tipos TypeScript.             |
| `npm run test`       | Executa os testes.                        |
| `npm run db:migrate` | Aplica migrations do banco SQLite local.  |

Consulte `docs/PROGRESS.md` para acompanhar o módulo em implementação.

Consulte também `docs/REVIEW.md` para as verificações e melhorias futuras.

Use o botão de lua/sol no cabeçalho após entrar no CRM para alternar o tema claro e escuro. A preferência é salva neste navegador.
