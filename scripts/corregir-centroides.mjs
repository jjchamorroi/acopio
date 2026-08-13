/**
 * Corrige el punto de las ciudades grandes: centro urbano, no centroide de área.
 *
 *   node scripts/corregir-centroides.mjs [--aplicar]
 *
 * La tabla `ciudad` traía el centroide GEOMÉTRICO del municipio, que en los
 * municipios grandes y rurales cae lejos de donde vive la gente. Riohacha
 * apuntaba 46 km tierra adentro, Cúcuta 21, Valledupar 17. Eso rompe dos
 * cosas visibles: el mapa se va al monte cuando alguien filtra por esa ciudad,
 * y los lugares de ubicación aproximada caen donde no hay nada.
 *
 * Los valores de abajo son el CENTRO URBANO de cada capital. Se corrigen solo
 * las que se comprobaron una por una; el resto del país se queda como está,
 * porque cambiar 1.122 filas a ciegas es peor que dejarlas.
 *
 * Se identifican por slug y no por nombre: hay dos Armenia (Quindío y
 * Antioquia) y dos Florencia (Caquetá y Cauca), y confundirlas mandaría una
 * ciudad entera a otro departamento.
 */
import pg from "pg";

const CENTROS_URBANOS = [
  ["riohacha", 11.5444, -72.9072],
  ["cucuta", 7.8939, -72.5078],
  ["valledupar", 10.4631, -73.2532],
  ["villavicencio", 4.142, -73.6266],
  ["monteria", 8.7479, -75.8814],
  ["cartagena-de-indias", 10.391, -75.4794],
  ["florencia-caqueta", 1.6144, -75.6062],
  ["neiva", 2.9273, -75.2819],
  ["barrancabermeja", 7.0653, -73.8547],
  ["mocoa", 1.1519, -76.647],
  ["popayan", 2.4448, -76.6147],
  ["sincelejo", 9.3047, -75.3978],
  ["ibague", 4.4389, -75.2322],
];

function distanciaKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL");
    process.exit(1);
  }
  console.log(aplicar ? "MODO: aplicar\n" : "MODO: ensayo (no escribe)\n");

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  let cambiadas = 0;
  for (const [slug, lat, lng] of CENTROS_URBANOS) {
    const { rows } = await pool.query(
      "SELECT slug, nombre, departamento, lat, lng FROM ciudad WHERE slug = $1",
      [slug]
    );
    if (!rows.length) {
      console.log(`⊘ no existe el slug ${slug}`);
      continue;
    }
    const c = rows[0];
    const d = distanciaKm(c.lat, c.lng, lat, lng);
    console.log(
      `${d > 3 ? "→" : "·"} ${c.nombre}, ${c.departamento}`.padEnd(42) +
        `${c.lat.toFixed(4)},${c.lng.toFixed(4)} → ${lat},${lng}  (${d.toFixed(1)} km)`
    );
    if (aplicar && d > 0.1) {
      await pool.query("UPDATE ciudad SET lat = $2, lng = $3 WHERE slug = $1", [slug, lat, lng]);
      cambiadas++;
    }
  }

  console.log(aplicar ? `\n${cambiadas} ciudades corregidas.` : "\n(ensayo, no se escribió nada)");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
