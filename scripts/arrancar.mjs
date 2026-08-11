/**
 * Punto de entrada del contenedor: aplica el esquema y después levanta Next.
 *
 * Existe porque desplegar código nuevo contra una base con el esquema viejo
 * rompe la aplicación entera —"column c.tipo does not exist"— y el paso de
 * migrar dependía de que alguien se acordara de correrlo a mano. Un paso
 * manual que hay que recordar en cada despliegue es un incidente esperando
 * su turno.
 *
 * Es seguro porque db/schema.sql es idempotente (CREATE ... IF NOT EXISTS,
 * ADD COLUMN IF NOT EXISTS, ON CONFLICT DO NOTHING): correrlo en cada arranque
 * no cambia nada si ya estaba aplicado.
 *
 * Si la migración falla igual arrancamos el servidor. Parece contradictorio,
 * pero un contenedor que no levanta no muestra logs ni responde /api/salud:
 * quedarías a ciegas justo cuando necesitás diagnosticar. Levantando, el
 * healthcheck reporta "esquema: pendiente" y el error queda escrito arriba.
 */
import { spawnSync } from "node:child_process";

const INTENTOS = 5;
const ESPERA_MS = 3000;

function esperar(ms) {
  // Bloqueante a propósito: acá todavía no hay servidor que atender.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "✗ Falta DATABASE_URL: no se aplica el esquema. La aplicación va a arrancar, pero sin base."
  );
} else {
  let aplicado = false;

  for (let intento = 1; intento <= INTENTOS && !aplicado; intento++) {
    const r = spawnSync(
      process.execPath,
      ["scripts/run-sql.mjs", "db/schema.sql"],
      { stdio: "inherit", cwd: process.cwd() }
    );

    if (r.status === 0) {
      aplicado = true;
      break;
    }

    if (intento < INTENTOS) {
      // Lo normal en el primer arranque: la base todavía no acepta conexiones.
      console.error(
        `  Reintentando la migración (${intento}/${INTENTOS - 1})…`
      );
      esperar(ESPERA_MS);
    }
  }

  if (!aplicado) {
    console.error(
      "✗ No se pudo aplicar el esquema tras varios intentos. Arranco igual para que /api/salud y los logs sigan accesibles."
    );
  }
}

await import("../server.js");
