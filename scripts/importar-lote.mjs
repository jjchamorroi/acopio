/**
 * Importa un lote de lugares verificados a mano (GeoJSON) a la base de datos.
 *
 *   node scripts/importar-lote.mjs <archivo.geojson> [--aplicar]
 *
 * Sin --aplicar hace un ENSAYO: valida y muestra qué haría, pero no escribe
 * nada. Es el modo por defecto a propósito — este script publica puntos en un
 * mapa de emergencia, y equivocarse manda gente a la dirección equivocada.
 *
 * Es re-ejecutable: cada lugar entra con su `origen_id`, así que la segunda
 * corrida actualiza en vez de duplicar. En una emergencia el lote se rehace
 * cada día y esa propiedad es lo que lo hace usable más de una vez.
 *
 * NO geocodifica. El lote trae las coordenadas ya resueltas y revisadas a
 * mano, con `precision_ubicacion` diciendo cuáles son exactas y cuáles quedaron
 * a nivel de barrio. Se probó lo contrario —resolver las direcciones contra
 * Nominatim— y falla con la nomenclatura colombiana: de 73 direcciones solo
 * ubicó 15, porque OpenStreetMap no tiene "Calle 49 # 27A-85". Confiar en el
 * lote revisado es más exacto y no depende de un servicio de terceros.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

// Sanidad geográfica. El límite duro solo busca cazar una coordenada
// traspuesta o con el signo cambiado, que cae a cientos de kilómetros; por eso
// es tan holgado. Entre medias se avisa pero se importa: el punto de `ciudad`
// es el centroide del ÁREA municipal, y en municipios grandes y rurales eso
// queda legítimamente lejos del casco urbano.
const RADIO_MAX_KM = 80;
const RADIO_AVISO_KM = 25;

// El lote nombra los municipios como los nombra la prensa; nuestra tabla usa
// el nombre oficial del DANE. No es un error de nadie, hay que traducir.
const ALIAS_MUNICIPIO = {
  cartagena: "cartagena de indias",
  "litoral del san juan": "el litoral del san juan",
  "bogota d.c.": "bogota",
  "bogota, d.c.": "bogota",
};

const MAPA_TIPO = { animal: "animales" };

const MAPA_CATEGORIA = {
  agua: "agua",
  alimentos_no_perecederos: "alimentos",
  aseo_personal: "aseo",
  panales_formula: "bebe",
  medicamentos: "medicamentos",
  colchonetas_cobijas: "dormir",
  ropa_calzado: "ropa",
  carpas_plasticos: "carpas",
  herramientas: "herramientas",
  linternas_pilas: "energia",
  alimento_mascotas: "mascotas",
  insumos_veterinarios: "veterinario",
  guacales_correas: "guacales",
  otros: "otros",
};

const ROLES = {
  punto_donacion: { recibe: true, entrega: false },
  recibe_damnificados: { recibe: false, entrega: true },
  ambos: { recibe: true, entrega: true },
};

const normalizar = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

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

function necesidades(lugar) {
  const salida = [];
  for (const [clave, nivel] of Object.entries(lugar.necesidades ?? {})) {
    const categoria = MAPA_CATEGORIA[clave];
    if (!categoria) {
      console.warn(`  ⚠ categoría desconocida "${clave}" en ${lugar.id}`);
      continue;
    }
    salida.push({ categoria, nivel });
  }
  return salida;
}

function notasCompletas(lugar) {
  const partes = [lugar.notas].filter(Boolean);
  if (lugar.sangre?.requisitos) {
    partes.push(`Requisitos para donar: ${lugar.sangre.requisitos}`);
  }
  if (lugar.sangre?.espera_estimada) {
    partes.push(`Espera estimada: ${lugar.sangre.espera_estimada}`);
  }
  return partes.length ? partes.join(" ") : null;
}

/** Aplana el GeoJSON a la forma que usa el resto del script. */
function leerLote(archivo) {
  const bruto = JSON.parse(readFileSync(archivo, "utf8"));
  if (bruto.type !== "FeatureCollection") {
    throw new Error("Se esperaba un GeoJSON FeatureCollection");
  }
  return bruto.features.map((f) => {
    const [lng, lat] = f.geometry?.coordinates ?? [];
    return { ...f.properties, lat, lng };
  });
}

async function main() {
  const archivo = process.argv[2];
  const aplicar = process.argv.includes("--aplicar");
  if (!archivo) {
    console.error("uso: node scripts/importar-lote.mjs <archivo.geojson> [--aplicar]");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL");
    process.exit(1);
  }

  const lugares = leerLote(archivo);
  console.log(`Lote: ${lugares.length} lugares (${archivo})`);
  console.log(aplicar ? "MODO: aplicar\n" : "MODO: ensayo (no escribe)\n");

  const local =
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("@db:");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });

  const { rows: ciudades } = await pool.query(
    "SELECT slug, nombre, departamento, lat, lng FROM ciudad"
  );
  const indice = new Map(
    ciudades.map((c) => [`${normalizar(c.nombre)}|${normalizar(c.departamento)}`, c])
  );

  const tokens = [];
  const r = { creados: 0, actualizados: 0, omitidos: 0, aprox: 0, exactos: 0, lejanos: 0 };

  for (const lugar of lugares) {
    // Las fichas de AUSENCIA vienen con vigente=false —correcto, no son un
    // servicio operando— pero son justo las que no se pueden callar: "el
    // epicentro no tiene albergue y necesita carpas". Entran marcadas.
    const esAlerta = lugar.es_alerta === true;

    // Los cerrados no entran: el propio lote dice a dónde redirigir, y un
    // punto cerrado en el mapa es un viaje perdido garantizado.
    if (lugar.vigente === false && !esAlerta) {
      console.log(`⊘ ${lugar.nombre} — CERRADO, se omite`);
      r.omitidos++;
      continue;
    }

    if (!Number.isFinite(lugar.lat) || !Number.isFinite(lugar.lng)) {
      console.log(`⊘ ${lugar.nombre} — sin coordenadas`);
      r.omitidos++;
      continue;
    }

    const muni = normalizar(lugar.municipio);
    const oficial = ALIAS_MUNICIPIO[muni] ?? muni;
    const ciudad =
      indice.get(`${oficial}|${normalizar(lugar.departamento)}`) ??
      ciudades.find((c) => normalizar(c.nombre) === oficial);

    if (!ciudad) {
      console.log(`⊘ ${lugar.nombre} — municipio desconocido: ${lugar.municipio}, ${lugar.departamento}`);
      r.omitidos++;
      continue;
    }

    // El lote viene revisado a mano, pero una coordenada traspuesta o con el
    // signo cambiado pone un albergue en otro departamento sin que nada más
    // lo note. Se comprueba antes de escribir, no después.
    const km = distanciaKm(lugar.lat, lugar.lng, ciudad.lat, ciudad.lng);
    if (km > RADIO_MAX_KM) {
      console.log(`⊘ ${lugar.nombre} — a ${km.toFixed(1)} km de ${ciudad.nombre}, se omite`);
      r.omitidos++;
      continue;
    }
    if (km > RADIO_AVISO_KM) {
      console.log(`  ⚠ ${lugar.nombre.slice(0, 44)} queda a ${km.toFixed(1)} km del punto de ${ciudad.nombre}`);
      r.lejanos++;
    }

    const aproximada = lugar.precision_ubicacion === "aproximada";
    aproximada ? r.aprox++ : r.exactos++;

    const tipo = MAPA_TIPO[lugar.tipo] ?? lugar.tipo;
    const rol = ROLES[lugar.rol] ?? ROLES.punto_donacion;
    const estado = lugar.verificado === true ? "verificado" : "pendiente";

    // Tri-estado a propósito: solo se afirma que admite mascotas cuando consta.
    // El lote ya trae el dato estructurado; el rastreo en las notas queda de
    // respaldo para las fichas viejas que no lo traían.
    const mascotas =
      typeof lugar.admite_mascotas === "boolean"
        ? lugar.admite_mascotas
        : /admite mascotas/i.test(lugar.notas ?? "")
          ? true
          : null;

    console.log(
      `${aproximada ? "≈" : "✓"} ${lugar.municipio.padEnd(18)} ` +
        `${lugar.nombre.slice(0, 50).padEnd(50)} ${km.toFixed(1).padStart(5)} km`
    );

    if (!aplicar) continue;

    const token = randomBytes(24).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");

    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");

      const { rows } = await cliente.query(
        `INSERT INTO centro_acopio (
           origen_id, nombre, direccion, ciudad_slug, lat, lng, tipo,
           responsable, telefono, horario, notas, alerta, no_recibe,
           estado, recibe_donaciones, entrega_ayuda, acepta_mascotas,
           tipos_sangre, ubicacion_aproximada,
           fuente_nombre, fuente_url, fuente_fecha, admin_token_hash,
           es_alerta, capacidad, ocupacion, servicios, requisitos_ingreso
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
         ON CONFLICT (origen_id) WHERE origen_id IS NOT NULL DO UPDATE SET
           nombre = EXCLUDED.nombre,
           direccion = EXCLUDED.direccion,
           lat = EXCLUDED.lat,
           lng = EXCLUDED.lng,
           tipo = EXCLUDED.tipo,
           responsable = EXCLUDED.responsable,
           -- El lote NUNCA borra información que ya está.
           --
           -- Con edicion_manual gana siempre lo que hay en la base: alguien
           -- lo curó a mano y sabe más que el lote (el comunicado oficial de un
           -- albergue publicaba el 119, que es la línea de bomberos).
           -- Sin la marca, el lote actualiza, pero un nulo suyo no puede
           -- reemplazar un dato existente.
           telefono = CASE WHEN centro_acopio.edicion_manual
                        THEN centro_acopio.telefono
                        ELSE COALESCE(EXCLUDED.telefono, centro_acopio.telefono) END,
           horario  = CASE WHEN centro_acopio.edicion_manual
                        THEN centro_acopio.horario
                        ELSE COALESCE(EXCLUDED.horario, centro_acopio.horario) END,
           notas    = CASE WHEN centro_acopio.edicion_manual
                        THEN centro_acopio.notas
                        ELSE COALESCE(EXCLUDED.notas, centro_acopio.notas) END,
           alerta = EXCLUDED.alerta,
           no_recibe = EXCLUDED.no_recibe,
           estado = EXCLUDED.estado,
           recibe_donaciones = EXCLUDED.recibe_donaciones,
           entrega_ayuda = EXCLUDED.entrega_ayuda,
           acepta_mascotas = EXCLUDED.acepta_mascotas,
           tipos_sangre = EXCLUDED.tipos_sangre,
           ubicacion_aproximada = EXCLUDED.ubicacion_aproximada,
           fuente_nombre = EXCLUDED.fuente_nombre,
           fuente_url = EXCLUDED.fuente_url,
           fuente_fecha = EXCLUDED.fuente_fecha,
           es_alerta = EXCLUDED.es_alerta,
           capacidad = COALESCE(EXCLUDED.capacidad, centro_acopio.capacidad),
           ocupacion = COALESCE(EXCLUDED.ocupacion, centro_acopio.ocupacion),
           servicios = COALESCE(EXCLUDED.servicios, centro_acopio.servicios),
           requisitos_ingreso = COALESCE(EXCLUDED.requisitos_ingreso, centro_acopio.requisitos_ingreso),
           actualizado_en = now()
         RETURNING id, (xmax = 0) AS creado, edicion_manual`,
        [
          lugar.id,
          lugar.nombre,
          lugar.direccion ?? "Dirección no publicada — confirma antes de ir",
          ciudad.slug,
          lugar.lat,
          lugar.lng,
          tipo,
          lugar.responsable,
          lugar.telefono,
          lugar.horario,
          notasCompletas(lugar),
          lugar.alerta,
          lugar.no_recibe?.length ? lugar.no_recibe.join(" · ") : null,
          estado,
          rol.recibe,
          rol.entrega,
          mascotas,
          lugar.sangre?.tipos_prioritarios?.join(", ") ?? null,
          aproximada,
          lugar.fuente?.nombre ?? null,
          lugar.fuente?.url ?? null,
          lugar.fuente?.fecha_publicacion ?? null,
          hash,
          esAlerta,
          lugar.capacidad ?? null,
          lugar.ocupacion ?? null,
          lugar.servicios?.length ? lugar.servicios.join(" · ") : null,
          lugar.requisitos_ingreso ?? null,
        ]
      );

      const { id, creado, edicion_manual } = rows[0];
      creado ? r.creados++ : r.actualizados++;
      if (creado) tokens.push({ id, nombre: lugar.nombre, token });

      if (edicion_manual) {
        // Ficha curada a mano: el lote SUMA lo que sepa, sin borrar lo que
        // alguien averiguó por su cuenta.
        for (const n of necesidades(lugar)) {
          await cliente.query(
            `INSERT INTO necesidad (centro_id, categoria, nivel) VALUES ($1,$2,$3)
             ON CONFLICT (centro_id, categoria) DO NOTHING`,
            [id, n.categoria, n.nivel]
          );
        }
      } else {
        // Se reemplazan en bloque: si el lote de hoy ya no menciona una
        // categoría, es que dejó de necesitarla.
        await cliente.query("DELETE FROM necesidad WHERE centro_id = $1", [id]);
        for (const n of necesidades(lugar)) {
          await cliente.query(
            "INSERT INTO necesidad (centro_id, categoria, nivel) VALUES ($1,$2,$3)",
            [id, n.categoria, n.nivel]
          );
        }
      }

      await cliente.query("COMMIT");
    } catch (e) {
      await cliente.query("ROLLBACK");
      console.error(`  ✗ ${lugar.nombre}: ${e.message}`);
      r.omitidos++;
    } finally {
      cliente.release();
    }
  }

  if (aplicar && tokens.length) {
    // Los enlaces privados se guardan fuera del repositorio: quien los tenga
    // puede editar el lugar sin más autenticación.
    const salida = `tokens-lote.json`;
    writeFileSync(salida, JSON.stringify(tokens, null, 2));
    console.log(`\nEnlaces privados de los ${tokens.length} creados: ${salida}`);
  }

  console.log(
    `\nResumen: ${r.creados} creados, ${r.actualizados} actualizados, ${r.omitidos} omitidos` +
      ` · ubicación ${r.exactos} exacta / ${r.aprox} aproximada` +
      (r.lejanos ? ` · ${r.lejanos} lejos del centro (revisar)` : "")
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
