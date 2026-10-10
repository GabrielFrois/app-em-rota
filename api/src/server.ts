import * as dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT ?? 3333;

app.listen(PORT, () => {
  console.log(`>> Em Rota API rodando em http://localhost:${PORT}`);
  console.log(`>> Ambiente: ${process.env.NODE_ENV ?? 'development'}`);
});
