/**
 * Convierte los límites departamentales de Colombia a un archivo compacto.
 *
 *   node scripts/generar-siluetas.mjs <colombia-departamentos.geo.json>
 *
 * El cartel que se comparte llevaba un recuadro blanco con puntos: sin
 * fronteras ni costa podía ser cualquier sitio del mundo. Con la silueta real
 * se reconoce dónde está pasando.
 *
 * Se empaqueta en el repositorio y no se piden teselas a un servidor:
 * OpenStreetMap prohíbe la descarga automatizada —se intentó y nos bloqueó,
 * imprimiendo el aviso dentro de la imagen— y un cartel que se genera cada vez
 * que alguien comparte no puede depender de un tercero que puede cortarnos.
 *
 * OJO con la fuente. El primer TopoJSON que se probó traía el `transform`
 * corrupto: al decodificarlo, "Manizales" caía en Terranova (Canadá). Se
 * detectó comprobando que las coordenadas resultantes estuvieran dentro de
 * Colombia, y esa comprobación se dejó puesta abajo.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

/** Puntos máximos por anillo. A 340 px no se distingue más detalle. */
const MAX_PUNTOS = 44;

/** Caja de Colombia, para verificar que la fuente es la que decimos. */
const COLOMBIA = { minLng: -82, maxLng: -66, minLat: -4.3, maxLat: 13.5 };

function simplificar(puntos, maximo = MAX_PUNTOS) {
  if (puntos.length <= maximo) return puntos;
  const paso = (puntos.length - 1) / (maximo - 1);
  const salida = [];
  for (let i = 0; i < maximo; i++) salida.push(puntos[Math.round(i * paso)]);
  return salida;
}

/** Redondea a 3 decimales (~110 m). Más precisión no se ve y pesa. */
const redondear = (p) => [Number(p[0].toFixed(3)), Number(p[1].toFixed(3))];

function area(r) {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
}

function anillosDe(geom, maximo = MAX_PUNTOS) {
  const poligonos =
    geom.type === "Polygon"
      ? [geom.coordinates]
      : geom.type === "MultiPolygon"
        ? geom.coordinates
        : [];

  return poligonos
    // Solo el anillo exterior: los huecos no se ven a este tamaño.
    .map((p) => p[0])
    .filter((r) => Array.isArray(r) && r.length >= 4)
    .sort((a, b) => area(b) - area(a))
    // Las islas diminutas ensucian sin aportar.
    .slice(0, 3)
    .map((r) => simplificar(r, maximo).map(redondear));
}

const normalizar = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Los nombres de la fuente no siempre son los del DANE que usa la tabla. */
const ALIAS = {
  "santafe de bogota d.c": "cundinamarca",
  "archipielago de san andres providencia y santa catalina":
    "archipielago de san andres",
};

/**
 * Los municipios se identifican por su CAJA, no por su nombre.
 *
 * La fuente (geoBoundaries) solo trae `shapeName`, sin departamento, y hay
 * nombres repetidos en varios departamentos —"San Rafael" está en cuatro—.
 * Buscando por nombre habría que adivinar cuál; buscando por coordenada, el
 * municipio correcto es simplemente el que contiene el punto. No hay ambigüedad
 * ni problemas de tildes o grafías.
 */
function municipiosDe(geo) {
  const salida = [];
  for (const f of geo.features) {
    const anillos = anillosDe(f.geometry, 30);
    if (!anillos.length) continue;
    const pts = anillos.flat();
    const lngs = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    salida.push({
      // [oeste, sur, este, norte], redondeado: solo sirve para descartar.
      b: [
        Number(Math.min(...lngs).toFixed(3)),
        Number(Math.min(...lats).toFixed(3)),
        Number(Math.max(...lngs).toFixed(3)),
        Number(Math.max(...lats).toFixed(3)),
      ],
      a: anillos,
    });
  }
  return salida;
}

const archivo = process.argv[2];
const archivoMunicipios = process.argv[3];
if (!archivo) {
  console.error(
    "uso: node scripts/generar-siluetas.mjs <departamentos.geojson> [municipios.geojson]"
  );
  process.exit(1);
}

const geo = JSON.parse(readFileSync(archivo, "utf8"));
const departamentos = {};
let fuera = 0;

for (const f of geo.features) {
  const nombre = normalizar(f.properties.NOMBRE_DPT ?? f.properties.name);
  const anillos = anillosDe(f.geometry);
  if (!anillos.length) continue;

  // Verificación de cordura: si un solo punto cae fuera de Colombia, la
  // fuente o la decodificación están mal y es mejor enterarse acá que verlo
  // en un cartel publicado.
  for (const [lng, lat] of anillos.flat()) {
    if (
      lng < COLOMBIA.minLng ||
      lng > COLOMBIA.maxLng ||
      lat < COLOMBIA.minLat ||
      lat > COLOMBIA.maxLat
    ) {
      fuera++;
    }
  }

  departamentos[ALIAS[nombre] ?? nombre] = anillos;
  // Bogotá se dibuja también como su propio nombre, por si acaso.
  if (nombre === "santafe de bogota d.c") departamentos["bogota"] = anillos;
}

if (fuera > 0) {
  console.error(`✗ ${fuera} coordenadas fuera de Colombia. Fuente incorrecta.`);
  process.exit(1);
}

const municipios = archivoMunicipios
  ? municipiosDe(JSON.parse(readFileSync(archivoMunicipios, "utf8")))
  : [];

mkdirSync("src/lib/geo", { recursive: true });
const salida = { departamentos, municipios };
writeFileSync("src/lib/geo/siluetas.json", JSON.stringify(salida));

console.log(
  `departamentos: ${Object.keys(departamentos).length} · municipios: ${municipios.length}`
);
console.log(
  `src/lib/geo/siluetas.json — ${(JSON.stringify(salida).length / 1024).toFixed(0)} KB`
);
