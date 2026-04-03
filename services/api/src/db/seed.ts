/**
 * Seed de desenvolvimento — executa o seed.sql no Supabase
 * Uso: pnpm ts-node src/db/seed.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida no .env');
  process.exit(1);
}

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  const seedPath = join(__dirname, '../../../../supabase/seed.sql');
  const seedSql = readFileSync(seedPath, 'utf-8');

  console.log('🌱 Aplicando seed de desenvolvimento...');

  try {
    // Executa cada statement separado por ponto e vírgula
    const statements = seedSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await sql.unsafe(statement);
    }

    console.log('✅ Seed aplicado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao aplicar seed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
