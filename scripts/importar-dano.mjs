/**
 * Importa el daño documentado por municipio.
 *
 *   node scripts/importar-dano.mjs <archivo.json> [--aplicar]
 *
 * Es la otra mitad del cruce: la tabla de lugares dice dónde HAY ayuda, esta
 * dice dónde HIZO FALTA. Sin las dos, un municipio sin puntos se ve igual que
 * un municipio sin daño.
 *
 * De lo que trae el archivo se guarda solo el daño. Los conteos de puntos de
 * ayuda que vienen calculados (`puntos_ayuda`, `albergues`, `estado`) se
 * DESCARTAN: son una foto del momento en que se armó el archivo, y acá se
 * recalculan contra centro_acopio en cada consulta. Guardarlos haría que la
 * página siguiera diciendo "sin ayuda" un día después de que alguien abriera
 * un acopio ahí.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

// El archivo usa el nombre corriente; la tabla usa el del DANE.
//
// "Belén de Bajirá" no está: es territorio en disputa entre Chocó y Antioquia
// y el DANE no lo reconoce como municipio. Se deja fuera antes que forzarlo a
// otro, que sería atribuir su daño a un municipio que no es.
const ALIAS_MUNICIPIO = {
  cartagena: "cartagena de indias",
  "litoral del san juan": "el litoral del san juan",
  "bogota d.c.": "bogota",
  buga: "guadalajara de buga",
  "calima-el darien": "calima",
  "calima el darien": "calima",
  "lopez de micay": "lopez",
};

const normalizar = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const num = (v) => (Number.isFinite(v) ? v : null);

async function main() {
  const archivo = process.argv[2];
  const aplicar = process.argv.includes("--aplicar");
  if (!archivo || !process.env.DATABASE_URL) {
    console.error("uso: DATABASE_URL=… node scripts/importar-dano.mjs <archivo.json> [--aplicar]");
    process.exit(1);
  }

  const bruto = JSON.parse(readFileSync(archivo, "utf8"));
  const filas = Array.isArray(bruto) ? bruto : Object.values(bruto);
  console.log(`Daño: ${filas.length} municipios (${archivo})`);
  console.log(aplicar ? "MODO: aplicar\n" : "MODO: ensayo (no escribe)\n");

  const local = process.env.DATABASE_URL.includes("localhost");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });

  const { rows: ciudades } = await pool.query(
    "SELECT slug, nombre, departamento FROM ciudad"
  );
  const indice = new Map(
    ciudades.map((c) => [`${normalizar(c.nombre)}|${normalizar(c.departamento)}`, c])
  );

  let ok = 0;
  const sinResolver = [];

  for (const f of filas) {
    const muni = normalizar(f.municipio);
    const oficial = ALIAS_MUNICIPIO[muni] ?? muni;
    const ciudad =
      indice.get(`${oficial}|${normalizar(f.departamento)}`) ??
      ciudades.find((c) => normalizar(c.nombre) === oficial);

    if (!ciudad) {
      sinResolver.push(`${f.municipio}, ${f.departamento}`);
      continue;
    }

    ok++;
    if (!aplicar) continue;

    await pool.query(
      `INSERT INTO dano_municipio (
         ciudad_slug, destruidas, averiadas, muertos, heridos, familias,
         personas, incomunicado, sin_ayuda, etnico, gravedad, nota, fuente
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (ciudad_slug) DO UPDATE SET
         destruidas = EXCLUDED.destruidas,
         averiadas = EXCLUDED.averiadas,
         muertos = EXCLUDED.muertos,
         heridos = EXCLUDED.heridos,
         familias = EXCLUDED.familias,
         personas = EXCLUDED.personas,
         incomunicado = EXCLUDED.incomunicado,
         sin_ayuda = EXCLUDED.sin_ayuda,
         etnico = EXCLUDED.etnico,
         gravedad = EXCLUDED.gravedad,
         nota = EXCLUDED.nota,
         fuente = EXCLUDED.fuente,
         actualizado_en = now()`,
      [
        ciudad.slug,
        num(f.destruidas),
        num(f.averiadas),
        num(f.muertos),
        num(f.heridos),
        num(f.familias),
        num(f.personas),
        f.incomunicado === true,
        f.sin_ayuda === true,
        f.etnico === true,
        num(f.gravedad),
        f.nota ?? null,
        f.fuente ?? null,
      ]
    );
  }

  if (sinResolver.length) {
    console.log(`⊘ ${sinResolver.length} municipios que no existen en nuestra tabla:`);
    for (const s of sinResolver) console.log("   -", s);
  }
  console.log(`\n${ok} de ${filas.length} resueltos${aplicar ? " y guardados" : ""}.`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
