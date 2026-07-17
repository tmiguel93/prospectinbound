# Segurança

O MVP usa autenticação local. As senhas são tratadas com bcrypt (12 rounds) e nunca são retornadas pela API. As sessões usam JWT em cookie HTTP-only, `SameSite=Lax` e oito horas de duração; em produção, o cookie exige HTTPS.

O login possui limitação básica de 10 tentativas a cada 15 minutos. Nunca versione `.env`, bancos SQLite, backups ou `node_modules`.
