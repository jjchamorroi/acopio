import { query } from "./db";
import { conCache } from "./cache";
import type { CentroPublico, Ciudad, DonacionPublica } from "./tipos";

/**
 * Segundos que se reutiliza cada resultado. Solo aplica a los LISTADOS: la
 * ficha de un lugar y el panel de su responsable van siempre contra la base,
 * porque ahí sí importa ver el cambio que uno acaba de guardar.
 */
const TTL_LISTADOS = 20;
const TTL_CIUDADES = 600; // Casi estático: cambia cuando agregamos una ciudad.

/**
 * Columnas publicables de una donación.
 *
 * Fijate que NO están `lat` ni `lng`: solo las aproximadas. La dirección real
 * del donante no sale de la base por ninguna consulta de este archivo, y esa
 * es justamente la garantía. Si algún día hace falta la exacta —para armarle
 * la ruta a un voluntario que ya aceptó— tiene que ser en una consulta aparte
 * y con autorización, nunca ampliando esta.
 */
const SELECT_DONACION = `
  SELECT
    d.id, d.categoria, d.descripcion, d.cantidad,
    d.ciudad_slug, ci.nombre AS ciudad_nombre, ci.departamento,
    d.lat_aprox, d.lng_aprox,
    d.contacto, d.telefono, d.notas, d.estado, d.es_demo,
    d.creado_en, d.vence_en
  FROM donacion d
  JOIN ciudad ci ON ci.slug = d.ciudad_slug
`;

/**
 * Agregamos las necesidades como JSON dentro de la misma consulta en vez de
 * hacer una query por centro. Con 500 acopios en el mapa la diferencia es
 * entre una consulta y quinientas.
 */
const SELECT_CENTRO = `
  SELECT
    c.id, c.nombre, c.direccion, c.ciudad_slug,
    ci.nombre AS ciudad_nombre, ci.departamento,
    c.lat, c.lng, c.responsable, c.telefono, c.horario, c.notas,
    c.estado, c.es_demo, c.actualizado_en,
    c.tipo, c.recibe_donaciones, c.entrega_ayuda, c.acepta_mascotas, c.atiende,
    COALESCE(
      (SELECT json_agg(json_build_object(
                'categoria', n.categoria,
                'nivel',     n.nivel,
                'detalle',   n.detalle
              ) ORDER BY
                CASE n.nivel WHEN 'urgente' THEN 0 WHEN 'necesita' THEN 1 ELSE 2 END,
                n.categoria)
       FROM necesidad n WHERE n.centro_id = c.id),
      '[]'::json
    ) AS necesidades
  FROM centro_acopio c
  JOIN ciudad ci ON ci.slug = c.ciudad_slug
`;

export async function listarCiudades(): Promise<Ciudad[]> {
  return conCache("ciudades", TTL_CIUDADES, () =>
    query<Ciudad>(
      `SELECT slug, nombre, departamento, lat, lng, prioridad
         FROM ciudad ORDER BY prioridad, nombre`
    )
  );
}

export type FiltrosCentros = {
  ciudad?: string;
  categoria?: string;
  /** "donar" muestra quien recibe donaciones; "ayuda", quien la entrega. */
  modo?: "donar" | "ayuda";
  tipo?: string;
  /** Solo lugares que confirmaron que aceptan animales. */
  soloAceptaMascotas?: boolean;
  /** Si es true incluye también los cerrados. Solo lo usa /admin. */
  incluirCerrados?: boolean;
};

export async function listarCentros(
  filtros: FiltrosCentros = {}
): Promise<CentroPublico[]> {
  return conCache(`centros:${JSON.stringify(filtros)}`, TTL_LISTADOS, () =>
    listarCentrosSinCache(filtros)
  );
}

async function listarCentrosSinCache(
  filtros: FiltrosCentros
): Promise<CentroPublico[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (!filtros.incluirCerrados) {
    condiciones.push(`c.estado <> 'cerrado'`);
  }
  if (filtros.ciudad) {
    params.push(filtros.ciudad);
    condiciones.push(`c.ciudad_slug = $${params.length}`);
  }
  if (filtros.modo === "donar") {
    condiciones.push("c.recibe_donaciones");
  } else if (filtros.modo === "ayuda") {
    condiciones.push("c.entrega_ayuda");
  }
  if (filtros.tipo) {
    params.push(filtros.tipo);
    condiciones.push(`c.tipo = $${params.length}`);
  }
  if (filtros.soloAceptaMascotas) {
    // `IS TRUE` y no `= true`: los que no informaron valen NULL, y decir
    // "acepta mascotas" de un lugar que nunca lo confirmó sería inventar.
    condiciones.push("c.acepta_mascotas IS TRUE");
  }
  if (filtros.categoria) {
    params.push(filtros.categoria);
    condiciones.push(
      `EXISTS (SELECT 1 FROM necesidad n
                WHERE n.centro_id = c.id
                  AND n.categoria = $${params.length}
                  AND n.nivel IN ('urgente', 'necesita'))`
    );
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  return query<CentroPublico>(
    `${SELECT_CENTRO} ${where}
     ORDER BY (c.estado = 'verificado') DESC, c.actualizado_en DESC`,
    params
  );
}

export async function obtenerCentro(id: string): Promise<CentroPublico | null> {
  const filas = await query<CentroPublico>(`${SELECT_CENTRO} WHERE c.id = $1`, [
    id,
  ]);
  return filas[0] ?? null;
}

export type FiltrosDonaciones = {
  ciudad?: string;
  categoria?: string;
  /** Por defecto solo las disponibles y vigentes. */
  incluirTodas?: boolean;
};

export async function listarDonaciones(
  filtros: FiltrosDonaciones = {}
): Promise<DonacionPublica[]> {
  return conCache(`donaciones:${JSON.stringify(filtros)}`, TTL_LISTADOS, () =>
    listarDonacionesSinCache(filtros)
  );
}

async function listarDonacionesSinCache(
  filtros: FiltrosDonaciones
): Promise<DonacionPublica[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (!filtros.incluirTodas) {
    // Una donación vencida o ya entregada solo sirve para hacer perder
    // el viaje a alguien.
    condiciones.push("d.estado = 'disponible'", "d.vence_en > now()");
  }
  if (filtros.ciudad) {
    params.push(filtros.ciudad);
    condiciones.push(`d.ciudad_slug = $${params.length}`);
  }
  if (filtros.categoria) {
    params.push(filtros.categoria);
    condiciones.push(`d.categoria = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  return query<DonacionPublica>(
    `${SELECT_DONACION} ${where} ORDER BY d.creado_en DESC LIMIT 300`,
    params
  );
}

export async function obtenerDonacion(
  id: string
): Promise<DonacionPublica | null> {
  const filas = await query<DonacionPublica>(
    `${SELECT_DONACION} WHERE d.id = $1`,
    [id]
  );
  return filas[0] ?? null;
}

/**
 * Acopios dentro de un radio, ordenados por distancia. Usa el índice GiST
 * sobre la columna geography, así que no recorre la tabla entera.
 * Es la base del futuro emparejamiento donante -> voluntario -> acopio.
 */
export async function centrosCercanos(
  lat: number,
  lng: number,
  radioKm = 15,
  categoria?: string
): Promise<(CentroPublico & { distancia_m: number })[]> {
  const params: unknown[] = [lng, lat, radioKm * 1000];
  let filtroCategoria = "";
  if (categoria) {
    params.push(categoria);
    filtroCategoria = `AND EXISTS (SELECT 1 FROM necesidad n
                                    WHERE n.centro_id = c.id
                                      AND n.categoria = $${params.length}
                                      AND n.nivel IN ('urgente', 'necesita'))`;
  }

  return query<CentroPublico & { distancia_m: number }>(
    `SELECT sub.*, ST_Distance(
              ST_SetSRID(ST_MakePoint(sub.lng, sub.lat), 4326)::geography,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) AS distancia_m
       FROM (
         ${SELECT_CENTRO}
         WHERE c.estado <> 'cerrado'
           AND ST_DWithin(c.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
           ${filtroCategoria}
       ) sub
      ORDER BY distancia_m
      LIMIT 50`,
    params
  );
}
