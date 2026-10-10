import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config();

async function main() {
  console.log('⏳ Rodando migrations...');
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  console.log('✅ Migrations aplicadas com sucesso!');
}

main()
  .then(() => setTimeout(() => process.exit(0), 500))
  .catch((err) => {
    console.error('❌ Erro nas migrations:', err);
    setTimeout(() => process.exit(1), 500);
  });