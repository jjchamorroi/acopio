import { query } from "./db";
import type { CentroPublico, Ciudad } from "./tipos";

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
  return query<Ciudad>(
    `SELECT slug, nombre, departamento, lat, lng, prioridad
       FROM ciudad ORDER BY prioridad, nombre`
  );
}

export type FiltrosCentros = {
  ciudad?: string;
  categoria?: string;
  /** Si es true incluye también los cerrados. Solo lo usa /admin. */
  incluirCerrados?: boolean;
};

export async function listarCentros(
  filtros: FiltrosCentros = {}
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
