# Segurança

O CRM usa autenticação local. As senhas são tratadas com bcrypt (12 rounds) e nunca são retornadas pela API. As sessões usam JWT em cookie HTTP-only, `SameSite=Lax` e oito horas de duração; em produção, o cookie exige HTTPS.

O login possui limitação de 10 tentativas a cada 15 minutos. A API aplica cabeçalhos de proteção com Helmet, restringe JSON a 1 MB e atualiza o limitador de tentativas para a versão corrigida contra desvio por IPv4 mapeado em IPv6.

Em produção, `JWT_SECRET` é obrigatório, privado e deve ter pelo menos 32 caracteres. O acesso CORS externo fica bloqueado por padrão; se houver um frontend hospedado em outro domínio, configure `CORS_ORIGIN` com as origens permitidas separadas por vírgula. A aplicação Docker publicada no mesmo domínio não precisa dessa variável.

Nunca versione `.env`, bancos SQLite, backups ou `node_modules`.
