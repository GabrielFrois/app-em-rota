# Em Rota — API

Backend REST com Node.js + Express + Drizzle ORM + Neon (PostgreSQL).

## Setup

### 1. Instalar dependências
```bash
npm install
```

### 2. Criar banco no Neon
1. Acesse https://neon.tech e crie uma conta gratuita
2. Crie um projeto chamado `emrota`
3. Copie a **Connection String**

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Preencha o `.env`:
- `DATABASE_URL` → sua connection string do Neon
- `JWT_SECRET` → gere com: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 4. Gerar e rodar migrations
```bash
npm run db:generate
npm run db:migrate
```

### 5. Rodar em desenvolvimento
```bash
npm run dev
```
API disponível em: http://localhost:3333

### 6. Testar
```bash
curl http://localhost:3333/health
```

## Rotas

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /auth/register | ❌ | Cadastro |
| POST | /auth/login | ❌ | Login |
| GET | /auth/me | ✅ | Dados do usuário logado |
| GET | /auth/search?q= | ✅ | Buscar usuário |
| GET | /itineraries | ✅ | Meus roteiros |
| GET | /itineraries/shared | ✅ | Compartilhados comigo |
| GET | /itineraries/:id | ✅ | Detalhe do roteiro |
| POST | /itineraries | ✅ | Criar roteiro |
| PATCH | /itineraries/:id | ✅ | Editar roteiro |
| DELETE | /itineraries/:id | ✅ | Excluir roteiro |
| POST | /itineraries/:id/share | ✅ | Compartilhar |
| DELETE | /itineraries/:id/share/:userId | ✅ | Remover compartilhamento |
| POST | /itineraries/days/:dayId/activities | ✅ | Criar atividade |
| PATCH | /itineraries/activities/:id | ✅ | Editar atividade |
| DELETE | /itineraries/activities/:id | ✅ | Excluir atividade |
