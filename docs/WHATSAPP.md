# WhatsApp Business Platform oficial

O CRM integra a WhatsApp Cloud API da Meta sem usar WhatsApp Web, automações não oficiais ou credenciais armazenadas no banco. A configuração é opcional: sem as variáveis abaixo, o envio fica bloqueado na API e nenhuma mensagem é disparada.

## Configuração

No ambiente de produção, defina:

```text
WHATSAPP_ACCESS_TOKEN=token_de_acesso_da_meta
WHATSAPP_PHONE_NUMBER_ID=id_do_numero_comercial
WHATSAPP_APP_SECRET=segredo_do_app_meta
WHATSAPP_VERIFY_TOKEN=token_aleatorio_definido_por_voce
WHATSAPP_API_VERSION=versao_do_graph_api_habilitada_no_app
```

Cadastre como callback no painel Meta a URL pública `https://seu-dominio/api/whatsapp/webhook` e o mesmo `WHATSAPP_VERIFY_TOKEN`. O webhook valida o desafio de assinatura e valida cada POST pelo cabeçalho `X-Hub-Signature-256` antes de gravar mensagens ou atualizar status de entrega.

`GET /api/whatsapp/status` informa apenas se a integração está pronta; não expõe segredos. `POST /api/whatsapp/messages` exige sessão autenticada, um lead com telefone e só persiste o envio após a confirmação da Meta. Mensagens recebidas e confirmações de entrega ficam na tabela de comunicação, que será reutilizada pelo chat interno.

Os limites de janela de atendimento, consentimento e templates aprovados continuam sendo responsabilidade da configuração da conta Meta; o CRM não tenta contornar essas regras.
