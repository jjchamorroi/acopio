/**
 * Respaldo completo de los datos a un archivo .sql restaurable.
 *
 *   npm run db:respaldo                      -> respalda la base local
 *   DATABASE_URL="postgres://…" npm run db:respaldo   -> respalda producción
 *
 * Para restaurar:
 *   node scripts/run-sql.mjs respaldos/respaldo-XXXX.sql
 *
 * No usa pg_dump a propósito: eso exigiría tener las herramientas de
 * PostgreSQL instaladas en Windows. Con esto, respaldar producción desde
 * cualquier máquina que tenga Node es un solo comando.
 *
 * Las columnas generadas (geom, geom_aprox) se excluyen consultando el
 * catálogo: Postgres las recalcula solo y rechaza que se les asigne un valor.
 *
 * OJO: el archivo resultante contiene teléfonos y ubicaciones exactas de
 * donantes. Es información personal — la carpeta respaldos/ está en
 * .gitignore y no debe subirse a ningún lado ni pasarse por chat.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

// Orden importante: las llaves foráneas exigen que ciudad exista antes que
// los lugares, y los lugares antes que sus necesidades.
const TABLAS = ["ciudad", "centro_acopio", "necesidad", "donacion"];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ Falta DATABASE_URL.");
  process.exit(1);
}

function literal(valor) {
  if (valor === null || valor === undefined) return "NULL";
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "boolean") return valor ? "TRUE" : "FALSE";
  if (valor instanceof Date) return `'${valor.toISOString()}'`;
  // Comillas simples duplicadas: es el escape estándar de SQL.
  return `'${String(valor).replace(/'/g, "''")}'`;
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const partes = [
  "-- Respaldo de la Red de Acopio",
  `-- Generado: ${new Date().toISOString()}`,
  "--",
  "-- Restaurar con:  node scripts/run-sql.mjs <este archivo>",
  "-- Es aditivo: no borra nada, y las filas que ya existan se omiten.",
  "--",
  "-- CONTIENE DATOS PERSONALES (teléfonos, ubicaciones). No compartir.",
  "",
  "BEGIN;",
  "",
];

const resumen = [];

for (const tabla of TABLAS) {
  // is_generated = 'NEVER' descarta las columnas que Postgres calcula solo.
  const { rows: cols } = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER'
      ORDER BY ordinal_position`,
    [tabla]
  );
  if (cols.length === 0) continue;

  const nombres = cols.map((c) => c.column_name);
  const { rows } = await client.query(
    `SELECT ${nombres.map((n) => `"${n}"`).join(", ")} FROM ${tabla}`
  );

  resumen.push(`${rows.length} ${tabla}`);
  if (rows.length === 0) continue;

  partes.push(`-- ${tabla}: ${rows.length} filas`);
  for (const fila of rows) {
    const valores = nombres.map((n) => literal(fila[n])).join(", ");
    partes.push(
      `INSERT INTO ${tabla} (${nombres.map((n) => `"${n}"`).join(", ")}) ` +
        `VALUES (${valores}) ON CONFLICT DO NOTHING;`
    );
  }
  partes.push("");
}

partes.push("COMMIT;", "");

await client.end();

const carpeta = join(process.cwd(), "respaldos");
await mkdir(carpeta, { recursive: true });

const sello = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 15);
const destino = join(carpeta, `respaldo-${sello}.sql`);

await writeFile(destino, partes.join("\n"), "utf8");

console.log(`✓ Respaldo guardado en respaldos/respaldo-${sello}.sql`);
console.log(`  ${resumen.join(" · ")}`);
console.log("  Contiene datos personales: no lo subas a ningún lado.");

// Un respaldo sin lugares casi siempre significa que se apuntó a la base
// equivocada —la local en vez de producción— o que se corrió justo después
// de recrear el volumen. Restaurarlo no borra nada (es aditivo), pero deja
// creyendo que hay una copia cuando en realidad no hay ninguna, que es la
// forma más cara de descubrir que no tenías respaldo.
const lugares = Number(
  resumen.find((r) => r.endsWith("centro_acopio"))?.split(" ")[0] ?? 0
);
if (lugares === 0) {
  console.warn("");
  console.warn("⚠  ATENCIÓN: este respaldo NO tiene ningún lugar registrado.");
  console.warn("   ¿Apuntaste a la base correcta? Revisá DATABASE_URL:");
  console.warn(`   ${url.replace(/:\/\/[^@]*@/, "://***@")}`);
}
