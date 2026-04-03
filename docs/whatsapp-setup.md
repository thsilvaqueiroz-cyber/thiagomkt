# Configuração do WhatsApp — Evolution API

## Pré-requisitos
- Docker Compose rodando (`make up`)
- Evolution API acessível em `http://localhost:8080` (dev) ou `https://wa.seudominio.com` (prod)

## 1. Criar instância pessoal (seu número)

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SEU_EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "thiago-personal",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true,
    "webhook": {
      "url": "http://api:3001/webhooks/evolution",
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "CONTACTS_UPSERT"]
    }
  }'
```

## 2. Escanear QR Code

```bash
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: SEU_EVOLUTION_API_KEY"
```

Acesse `http://localhost:8080/instance/connect/thiago-personal` no navegador para ver o QR Code.

## 3. Verificar conexão

```bash
curl http://localhost:8080/instance/connectionState/thiago-personal \
  -H "apikey: SEU_EVOLUTION_API_KEY"
```

## 4. Criar instância para cliente demo (opcional)

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SEU_EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "cliente-demo",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'
```

## Comandos disponíveis (seu número)

Envie estas mensagens para o seu próprio WhatsApp:

| Comando | Ação |
|---------|------|
| `novo lead: Nome \| Empresa \| Telefone \| Nota` | Cria lead no CRM |
| `status pipeline` | Resumo do funil de vendas |
| `qualificar [nome]` | Qualificação IA de um lead |
| `escrever post sobre [tópico]` | Gera post para LinkedIn |
| `briefing` | Resumo: leads, faturas, milestones |

## Modo manual (pausar IA)

Para pausar a IA em uma conversa e assumir manualmente:
```bash
curl -X PATCH http://localhost:3001/webhooks/conversations/{ID}/pause \
  -H "Content-Type: application/json" \
  -d '{"hours": 24}'
```
