/**
 * Genera db/municipios.sql a partir del volcado de GeoNames para Colombia.
 *
 *   1. Descargar https://download.geonames.org/export/dump/CO.zip
 *   2. Descomprimir CO.txt
 *   3. node scripts/generar-municipios.mjs ruta/a/CO.txt
 *
 * Se corre a mano y muy de vez en cuando: la división político-administrativa
 * no cambia en una emergencia. El resultado sí se versiona, para que nadie
 * tenga que bajar 2 MB de GeoNames para levantar el proyecto.
 *
 * Las entradas ADM2 de GeoNames son los municipios (1.122 para Colombia,
 * incluidos distritos y áreas no municipalizadas).
 */
import { readFile, writeFile } from "node:fs/promises";

const origen = process.argv[2];
if (!origen) {
  console.error("Uso: node scripts/generar-municipios.mjs <CO.txt>");
  process.exit(1);
}

/**
 * Los trece que ya estaban en la base ANTES de este listado. Sus slugs no se
 * pueden tocar: hay lugares registrados que los referencian. Se mapean a mano
 * porque GeoNames los nombra distinto ("Santiago de Cali", "Bogotá  D.C.").
 */
const SLUGS_EXISTENTES = new Map([
  ["Pereira|Risaralda", "pereira"],
  ["Manizales|Caldas", "manizales"],
  ["Armenia|Quindío", "armenia"],
  ["Quibdó|Chocó", "quibdo"],
  ["Buenaventura|Valle del Cauca", "buenaventura"],
  ["Cali|Valle del Cauca", "cali"],
  ["Medellín|Antioquia", "medellin"],
  ["Dosquebradas|Risaralda", "dosquebradas"],
  ["Cartago|Valle del Cauca", "cartago"],
  ["Istmina|Chocó", "istmina"],
  ["Bogotá D.C.|Bogotá D.C.", "bogota"],
  ["Barranquilla|Atlántico", "barranquilla"],
  ["Bucaramanga|Santander", "bucaramanga"],
]);

// Los cinco departamentos con el grueso del daño.
const DEPTOS_EMERGENCIA = new Set([
  "Chocó",
  "Risaralda",
  "Quindío",
  "Caldas",
  "Valle del Cauca",
]);

// El resto del occidente y suroccidente.
const DEPTOS_OCCIDENTE = new Set([
  "Antioquia",
  "Cauca",
  "Nariño",
  "Tolima",
  "Huila",
]);

/** Capitales del resto del país: entran por delante de sus municipios. */
const CAPITALES = new Set([
  "Bogotá D.C.", "Cartagena", "Cúcuta", "Santa Marta", "Villavicencio",
  "Neiva", "Pasto", "Popayán", "Montería", "Sincelejo", "Valledupar",
  "Riohacha", "Yopal", "Tunja", "Florencia", "Mocoa", "Arauca", "Leticia",
  "Mitú", "Puerto Carreño", "Inírida", "San José del Guaviare",
  "San Andrés", "Ibagué", "Bucaramanga", "Barranquilla", "Armenia",
  "Manizales", "Pereira", "Quibdó", "Medellín", "Cali",
]);

function limpiarDepartamento(nombre) {
  return nombre
    .replace(/^Departamento (de|del) /i, "")
    .replace(/ Department$/i, "")
    .replace(/^Distrito Capital de Bogotá$/i, "Bogotá D.C.")
    .replace(/^Archipiélago de San Andrés.*/i, "San Andrés y Providencia")
    .trim();
}

function normalizarMunicipio(nombre) {
  return nombre.replace(/\s+/g, " ").replace(/\s*D\.C\.$/, " D.C.").trim();
}

function slugificar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const texto = await readFile(origen, "utf8");
const departamentos = new Map();
const municipios = [];

for (const linea of texto.split("\n")) {
  const c = linea.split("\t");
  if (c.length < 12) continue;
  if (c[7] === "ADM1") departamentos.set(c[10], limpiarDepartamento(c[1]));
  else if (c[7] === "ADM2") municipios.push(c);
}

// Primera pasada: detectar nombres repetidos entre departamentos.
const conteo = new Map();
for (const m of municipios) {
  const nombre = normalizarMunicipio(m[1]);
  conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
}

const filas = [];
const usados = new Set();

for (const m of municipios) {
  const nombre = normalizarMunicipio(m[1]);
  const depto = departamentos.get(m[10]) ?? "";
  if (!depto) continue;

  const lat = Number(m[4]);
  const lng = Number(m[5]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

  const clave = `${nombre}|${depto}`;
  let slug = SLUGS_EXISTENTES.get(clave);

  if (!slug) {
    slug = slugificar(nombre);
    // Hay municipios homónimos en departamentos distintos —Armenia está en
    // Quindío y en Antioquia—: sin el sufijo, uno pisaría al otro.
    if (conteo.get(nombre) > 1 || usados.has(slug)) {
      slug = `${slug}-${slugificar(depto)}`;
    }
  }

  if (usados.has(slug)) continue; // Último recurso: no duplicar la llave.
  usados.add(slug);

  let prioridad = 5;
  if (DEPTOS_EMERGENCIA.has(depto)) prioridad = 2;
  else if (DEPTOS_OCCIDENTE.has(depto)) prioridad = 3;
  else if (CAPITALES.has(nombre)) prioridad = 4;

  filas.push({ slug, nombre, depto, lat, lng, prioridad });
}

filas.sort(
  (a, b) =>
    a.prioridad - b.prioridad ||
    a.depto.localeCompare(b.depto) ||
    a.nombre.localeCompare(b.nombre)
);

const esc = (s) => s.replace(/'/g, "''");

const salida = [
  "-- Municipios de Colombia. GENERADO — no editar a mano.",
  "--   node scripts/generar-municipios.mjs <CO.txt>",
  "--",
  "-- Fuente: GeoNames (https://www.geonames.org/), entradas ADM2, CC BY 4.0.",
  "--",
  "-- ON CONFLICT DO NOTHING es deliberado: los municipios que ya existían",
  "-- conservan sus coordenadas, que están revisadas a mano. La de Bogotá en",
  "-- GeoNames, por ejemplo, es el centroide del distrito entero y cae en",
  "-- Sumapaz, a 40 km del centro.",
  "--",
  "-- prioridad: 1 = foco del sismo · 2 = departamentos más afectados",
  "--            3 = resto del occidente · 4 = capitales · 5 = resto del país",
  "",
  "INSERT INTO ciudad (slug, nombre, departamento, lat, lng, prioridad) VALUES",
];

salida.push(
  filas
    .map(
      (f) =>
        `  ('${esc(f.slug)}', '${esc(f.nombre)}', '${esc(f.depto)}', ${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}, ${f.prioridad})`
    )
    .join(",\n") + "\nON CONFLICT (slug) DO NOTHING;"
);

await writeFile("db/municipios.sql", salida.join("\n") + "\n", "utf8");

const porPrioridad = filas.reduce((acc, f) => {
  acc[f.prioridad] = (acc[f.prioridad] ?? 0) + 1;
  return acc;
}, {});

console.log(`✓ db/municipios.sql — ${filas.length} municipios`);
for (const [p, n] of Object.entries(porPrioridad).sort()) {
  console.log(`  prioridad ${p}: ${n}`);
}
console.log(`  departamentos: ${departamentos.size}`);
