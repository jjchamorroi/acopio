import { createHash } from "node:crypto";
import { query } from "./db";

/**
 * Límite de peticiones por IP, con ventana fija guardada en Postgres.
 *
 * Ventana fija y no deslizante a propósito: en el peor caso alguien mete el
 * doble del cupo justo en el cambio de ventana. Para frenar el registro
 * masivo de acopios falsos eso es más que suficiente, y evita guardar una
 * fila por petición.
 */

export type ResultadoLimite = {
  permitido: boolean;
  restantes: number;
  /** Segundos que faltan para que se libere cupo. */
  reintentarEn: number;
};

/**
 * Identifica al cliente detrás del proxy.
 *
 * OJO: `x-forwarded-for` lo puede falsificar cualquiera si la aplicación queda
 * expuesta directamente a internet. Es fiable únicamente porque en producción
 * Traefik (el proxy de Dokploy) reescribe la cabecera. Si algún día se publica
 * el puerto 3000 sin proxy delante, este límite deja de servir.
 */
function identificar(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip =
    xff?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "desconocida";

  // Sal por despliegue: el hash no se puede cruzar con el de otra instalación
  // ni revertir por fuerza bruta sobre el espacio de direcciones IPv4.
  const sal = process.env.ADMIN_TOKEN ?? "sal-por-defecto";
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Consume una unidad del cupo. Devuelve si la petición puede seguir.
 *
 * Todo ocurre en una sola sentencia atómica: dos peticiones simultáneas de la
 * misma IP no pueden leer el mismo contador y escribir el mismo valor.
 */
export async function consumirLimite(
  req: Request,
  accion: string,
  maximo: number,
  ventanaSegundos: number
): Promise<ResultadoLimite> {
  const clave = `${accion}:${identificar(req)}`;
  const intervalo = `${ventanaSegundos} seconds`;

  const filas = await query<{ conteo: number; restan: number }>(
    `INSERT INTO limite_peticion (clave, ventana_inicio, conteo)
     VALUES ($1, now(), 1)
     ON CONFLICT (clave) DO UPDATE SET
       conteo = CASE
                  WHEN limite_peticion.ventana_inicio < now() - $2::interval
                  THEN 1
                  ELSE limite_peticion.conteo + 1
                END,
       ventana_inicio = CASE
                  WHEN limite_peticion.ventana_inicio < now() - $2::interval
                  THEN now()
                  ELSE limite_peticion.ventana_inicio
                END
     RETURNING conteo,
               GREATEST(0, CEIL(EXTRACT(EPOCH FROM
                 (ventana_inicio + $2::interval) - now()
               )))::int AS restan`,
    [clave, intervalo]
  );

  const { conteo, restan } = filas[0];

  return {
    permitido: conteo <= maximo,
    restantes: Math.max(0, maximo - conteo),
    reintentarEn: restan,
  };
}

/**
 * Borra contadores vencidos. Se llama de vez en cuando (no en cada petición)
 * para que la tabla no crezca sin fin; no hace falta que sea exacto.
 */
export async function limpiarLimitesVencidos() {
  try {
    await query("DELETE FROM limite_peticion WHERE ventana_inicio < now() - interval '1 day'");
  } catch (err) {
    // Que falle la limpieza no puede tumbar la petición del usuario.
    console.error("No se pudieron limpiar los límites vencidos:", err);
  }
}

/** Respuesta estándar cuando se agota el cupo. */
export function respuesta429(resultado: ResultadoLimite, mensaje: string) {
  const minutos = Math.ceil(resultado.reintentarEn / 60);
  return Response.json(
    {
      error: mensaje,
      reintentar_en_segundos: resultado.reintentarEn,
      detalle: `Vuelve a intentarlo en ${minutos} minuto${minutos === 1 ? "" : "s"}.`,
    },
    {
      status: 429,
      headers: { "retry-after": String(resultado.reintentarEn) },
    }
  );
}
