# Em Rota

Aplicativo mobile para planejamento e compartilhamento de roteiros de viagem.

---

## Funcionalidades
 
- Criação e gerenciamento de roteiros de viagem
- Organização de atividades por dia e período (manhã, tarde, noite, madrugada)
- Compartilhamento de roteiros com outras pessoas (permissão de visualização ou edição)
- Modo escuro / claro automático
- Acesso offline para visualização de roteiros já carregados
- Autenticação com JWT

---

## Estrutura do projeto

```
em-rota/
├── mobile/                      # App React Native / Expo
│   ├── src/
│   │   ├── components/
│   │   │   ├── Button.tsx       # Botão reutilizável (primary, secondary, danger)
│   │   │   └── Input.tsx        # Input reutilizável com label e erro
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx  # Autenticação global (user, token, login, logout)
│   │   │   └── ThemeContext.tsx # Tema global (claro/escuro)
│   │   ├── hooks/
│   │   │   └── useColors.ts     # Hook de cores baseado no tema atual
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx      # Raiz: Auth vs Main
│   │   │   ├── AuthNavigator.tsx      # Stack: Login, Registro, Esqueci senha
│   │   │   ├── MainNavigator.tsx      # Tab: Roteiros, Comigo, Perfil
│   │   │   └── ItineraryNavigator.tsx # Stack: Lista, Detalhe, Criação
│   │   ├── screens/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── RegisterScreen.tsx
│   │   │   ├── Itinerary/
│   │   │   │   ├── CreateItineraryScreen.tsx  # Criação com ícone, cor, datas
│   │   │   │   └── ItineraryDetailScreen.tsx  # Detalhe com dias e atividades
│   │   │   └── Main/
│   │   │       ├── MyItinerariesScreen.tsx    # Meus roteiros (filtro por status)
│   │   │       ├── SharedItinerariesScreen.tsx # Compartilhados comigo
│   │   │       └── ProfileScreen.tsx          # Perfil, tema, senha, logout
│   │   ├── services/
│   │   │   ├── api.ts               # Cliente Axios + todos os serviços da API
│   │   │   ├── notifications.ts     # Registro e remoção de tokens push (expo-notifications)
│   │   │   └── prefetchService.ts   # Pré-cache de detalhes de roteiros em segundo plano
│   │   ├── styles/
│   │   │   └── theme.ts         # Cores, tipografia, espaçamentos, sombras
│   │   └── types/
│   │       └── index.ts         # Tipos globais, EMOTION_OPTIONS, navegação
│   ├── App.tsx
│   ├── app.json
│   └── package.json
│
└── api/                         # Backend Express
    └── src/
        ├── controllers/
        │   ├── authController.ts       # register, login, me, forgotPassword, resetPassword
        │   └── itineraryController.ts  # CRUD roteiros, dias, atividades, compartilhamento
        ├── db/
        │   ├── schema/index.ts         # Tabelas Drizzle (users, itineraries, days, activities, shares, password_reset_tokens)
        │   ├── migrations/             # Migrations SQL geradas pelo Drizzle
        │   └── migrate.ts              # Script de execução de migrations
        ├── middleware/
        │   └── auth.ts                 # Verificação JWT
        ├── routes/
        │   ├── auth.ts
        │   └── itineraries.ts
        ├── services/
        │   └── pushService.ts          # Envio de notificações push via Expo Push API
        ├── app.ts
        └── server.ts
```

---

## Tecnologias
 
**Backend (`api/`)**
- Node.js + Express + TypeScript
- PostgreSQL via [Neon](https://neon.tech) (serverless)
- Drizzle ORM
- JWT para autenticação
- Hospedado no [Render](https://render.com/)

**Mobile (`mobile/`)**
- React Native + Expo (SDK 54)
- TypeScript
- React Navigation
- Axios
- AsyncStorage para cache offline
- expo-notifications para notificações push

---

## Configuração

### Pré-requisitos
 
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Conta no [Neon](https://neon.tech) para o banco de dados

### Backend
 
```bash
cd api
npm install
```
 
Crie o arquivo `.env` baseado no `env.example`:
 
```env
DATABASE_URL="postgresql://user:password@ep-xxxx.neon.tech/emrota?sslmode=require"
JWT_SECRET="seu_jwt_secret_forte"
JWT_EXPIRES_IN="30d"
PORT=3333
NODE_ENV=development
```
 
Rode as migrations:
 
```bash
npm run db:migrate
```
 
Inicie o servidor:
 
```bash
npm run dev
```
 
### Mobile
 
```bash
cd mobile
npm install
```
 
Inicie o app:
 
```bash
npx expo start
```
 
Escaneie o QR code com o app **Expo Go** no celular.

---
 
## Banco de dados
 
O projeto usa PostgreSQL hospedado no Neon. Para criar as tabelas, rode as migrations:
 
```bash
cd api
npm run db:migrate
```
 
Para gerar uma nova migration após alterar o schema:
 
```bash
npm run db:generate
```

---

## Deploy
 
- **API:** hospedada no Render com deploy automático via GitHub.
- **Mobile:** build gerado via EAS Build. A URL da API de produção fica em `mobile/app.json` no campo `extra.apiUrl`.