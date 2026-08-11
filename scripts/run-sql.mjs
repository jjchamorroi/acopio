/**
 * Ejecuta un archivo .sql contra DATABASE_URL.
 *
 *   node scripts/run-sql.mjs db/schema.sql
 *
 * Existe para que el esquema y los datos de prueba tengan una sola fuente de
 * verdad (los .sql de db/) y se puedan aplicar de tres formas distintas:
 * automáticamente al crear el contenedor, a mano con psql, o desde npm.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const archivo = process.argv[2];

if (!archivo) {
  console.error("Uso: node scripts/run-sql.mjs <archivo.sql>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ Falta DATABASE_URL. Copiá .env.example a .env.");
  process.exit(1);
}

const ruta = resolve(process.cwd(), archivo);
const sql = await readFile(ruta, "utf8");
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query(sql);
  console.log(`✓ Aplicado: ${archivo}`);

  const { rows } = await client.query(
    `SELECT (SELECT count(*) FROM ciudad)::int AS ciudades,
            (SELECT count(*) FROM centro_acopio)::int AS acopios`
  );
  console.log(`  ${rows[0].ciudades} ciudades · ${rows[0].acopios} acopios`);
} catch (err) {
  console.error(`✗ Error aplicando ${archivo}:`, err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
