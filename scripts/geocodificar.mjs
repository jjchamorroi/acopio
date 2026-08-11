/**
 * Resuelve direcciones a coordenadas con Nominatim (OpenStreetMap).
 *
 *   node scripts/geocodificar.mjs "Carrera 43 #6-120" Barranquilla
 *   node scripts/geocodificar.mjs --lote archivo.txt
 *
 * Sirve para saber, ANTES de cargar un lugar, si su dirección se puede ubicar
 * en el mapa. Una dirección que el geocodificador no encuentra tampoco la va a
 * encontrar quien intente llegar con el carro cargado.
 *
 * Nominatim es gratuito y sin clave, pero pide un máximo de una consulta por
 * segundo y una identificación en el User-Agent. Ambas cosas se respetan acá:
 * abusar del servicio sería una forma tonta de que nos bloqueen.
 *
 * OJO con el resultado: que devuelva coordenadas NO garantiza que sean las
 * correctas. La numeración colombiana (carrera/calle con #) se le da mal, y a
 * veces cae en el centro de la ciudad o en una vía parecida. Por eso el script
 * reporta la confianza y el tipo de coincidencia: hay que mirarlas en el mapa
 * antes de darlas por buenas.
 */
const AGENTE = "RedDeAcopio/1.0 (proyecto ciudadano sismo Colombia 2026)";
const ESPERA_MS = 1100;

function dormir(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodificar(direccion, ciudad) {
  const consulta = `${direccion}, ${ciudad}, Colombia`;
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: consulta,
      format: "json",
      limit: "1",
      countrycodes: "co",
      addressdetails: "1",
    });

  const res = await fetch(url, { headers: { "User-Agent": AGENTE } });
  if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);
  const datos = await res.json();
  if (datos.length === 0) return null;

  const r = datos[0];
  return {
    lat: Number(r.lat),
    lng: Number(r.lon),
    tipo: r.type,
    clase: r.class,
    // Si Nominatim no devuelve house_number, encontró la VÍA y no el portal.
    // Es la diferencia entre "esta cuadra" y "esta puerta", y a un voluntario
    // con el carro cargado esa diferencia le cuesta media hora dando vueltas.
    numero: r.address?.house_number ?? null,
    // importance de Nominatim: qué tan "relevante" es la coincidencia.
    confianza: Number(r.importance ?? 0),
    encontrado: r.display_name,
  };
}

const args = process.argv.slice(2);

if (args[0] === "--lote") {
  const { readFile } = await import("node:fs/promises");
  const texto = await readFile(args[1], "utf8");
  const lineas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  console.log(
    "estado".padEnd(9) +
      "ciudad".padEnd(14) +
      "dirección".padEnd(42) +
      "coordenadas"
  );
  console.log("-".repeat(100));

  for (const linea of lineas) {
    const [ciudad, ...resto] = linea.split("|");
    const direccion = resto.join("|").trim();
    let r = null;
    try {
      r = await geocodificar(direccion, ciudad.trim());
    } catch (err) {
      console.log(`ERROR    ${ciudad.trim().padEnd(14)}${direccion}  → ${err.message}`);
      await dormir(ESPERA_MS);
      continue;
    }

    if (!r) {
      console.log(
        "NO HALLA ".padEnd(9) +
          ciudad.trim().padEnd(14) +
          direccion.slice(0, 40).padEnd(42) +
          "—"
      );
    } else {
      // class 'highway' = encontró una vía. Sin house_number, el punto está
      // en algún lugar de esa vía, no en el portal.
      const preciso = r.clase !== "highway" && r.numero !== null;
      console.log(
        (preciso ? "OK       " : "APROX    ") +
          ciudad.trim().padEnd(14) +
          direccion.slice(0, 40).padEnd(42) +
          `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}  [${r.tipo}]`
      );
      if (!preciso) console.log(" ".repeat(9) + `→ cayó en: ${r.encontrado}`);
    }
    await dormir(ESPERA_MS);
  }
} else {
  const [direccion, ciudad] = args;
  if (!direccion || !ciudad) {
    console.error('Uso: node scripts/geocodificar.mjs "<dirección>" <ciudad>');
    process.exit(1);
  }
  const r = await geocodificar(direccion, ciudad);
  console.log(r ? JSON.stringify(r, null, 2) : "No se encontró.");
}
