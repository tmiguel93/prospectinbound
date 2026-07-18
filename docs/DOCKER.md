# Execução com Docker

O Compose entrega a aplicação completa em um único contêiner: a API Express também serve o frontend compilado. O banco SQLite e os backups ficam em volumes nomeados, preservados entre atualizações do contêiner.

## Subida local

1. Copie `.env.docker.example` para `.env.docker`.
2. Troque `JWT_SECRET` por uma chave aleatória com pelo menos 32 caracteres. Esse arquivo não deve ser versionado.
3. Inicie a aplicação:

```powershell
docker compose --env-file .env.docker up --build -d
```

Abra `http://localhost:3000`. Se o modo de desenvolvimento já estiver usando essa porta, encerre-o antes ou altere temporariamente a porta publicada em `compose.yaml`.

## Operação

```powershell
# Estado e saúde
docker compose --env-file .env.docker ps

# Logs em tempo real
docker compose --env-file .env.docker logs -f crm

# Parar sem apagar dados
docker compose --env-file .env.docker down
```

Não use `down -v` a menos que queira remover de forma definitiva o banco e os backups dos volumes `crm_data` e `crm_backups`.

## Gateway reverso opcional

Para expor o CRM por um gateway Nginx local, com cabeçalhos de borda e limite de corpo de 1 MB, execute:

```powershell
docker compose --env-file .env.docker -f compose.yaml -f compose.proxy.yaml up --build -d
```

O acesso pelo gateway será `http://localhost:8080`; a porta direta `3000` continua disponível para diagnóstico. Em produção, termine TLS no proxy ou balanceador da infraestrutura e mantenha `JWT_SECRET` privado.
