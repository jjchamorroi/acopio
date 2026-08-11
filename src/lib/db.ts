import { Pool } from "pg";

// Next reinicia módulos en cada recarga de dev; sin este cache global
// abriríamos un pool nuevo por recarga hasta agotar las conexiones de Postgres.
const globalForDb = globalThis as unknown as { pool?: Pool };

/**
 * El pool se crea la primera vez que alguien consulta, NO al importar el
 * módulo. Es deliberado: `next build` importa las rutas para analizarlas, y si
 * exigiéramos DATABASE_URL en ese momento la imagen de Docker no podría
 * construirse sin una base de datos levantada.
 */
export function getPool(): Pool {
  if (globalForDb.pool) return globalForDb.pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env y completalo."
    );
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  // Sin este listener, un corte de red mata el proceso entero: los errores de
  // un cliente ocioso se emiten en el pool y un 'error' sin manejar es fatal.
  pool.on("error", (err) => {
    console.error("Error inesperado en el pool de Postgres:", err.message);
  });

  globalForDb.pool = pool;
  return pool;
}

export async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}
