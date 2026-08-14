import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Cuenta una visita.
 *
 * Lo llama el navegador y no el servidor al renderizar, por dos razones: casi
 * ningún robot ejecuta JavaScript, así que el conteo sale limpio sin
 * mantener listas de user-agents; y no añade una escritura a la base en el
 * camino crítico de la página, que es lo que ve la gente.
 *
 * Todo se guarda AGREGADO. No hay una fila por visita, ni IP, ni navegador, ni
 * nada que identifique a nadie.
 */

/** Rutas que se cuentan. Cualquier otra se agrupa, para no llenar la tabla
 *  con una fila por cada id de acopio. */
function normalizar(ruta: string): string {
  const limpia = ruta.split("?")[0].replace(/\/+$/, "") || "/";
  if (limpia === "/") return "/";
  if (/^\/acopio\/[^/]+\/panel$/.test(limpia)) return "/acopio/:id/panel";
  if (/^\/acopio\/[^/]+$/.test(limpia)) return "/acopio/:id";
  if (/^\/convocatoria\/[^/]+$/.test(limpia)) return "/convocatoria/:id";
  if (/^\/donacion\/[^/]+$/.test(limpia)) return "/donacion/:id";
  return limpia.slice(0, 80);
}

/**
 * De dónde llega. Solo el dominio: la URL completa del origen puede llevar
 * términos de búsqueda o identificadores de campaña, que son datos de la
 * persona y no del sitio.
 */
function origenDe(referido: string | null, propio: string): string {
  if (!referido) return "directo";
  try {
    const host = new URL(referido).hostname.replace(/^www\./, "");
    if (host === propio.replace(/^www\./, "")) return "interno";
    return host.slice(0, 80);
  } catch {
    return "directo";
  }
}

export async function POST(req: Request) {
  let cuerpo: { ruta?: string; referido?: string | null };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ruta = normalizar(String(cuerpo.ruta ?? "/"));
  const origen = origenDe(
    cuerpo.referido ?? null,
    new URL(req.url).hostname
  );

  // Huella del día: hash irreversible que LLEVA LA FECHA DENTRO, así que la de
  // hoy y la de mañana de la misma persona no se parecen. No permite seguir a
  // nadie entre días ni aunque quisiéramos; solo evita contar cinco veces a
  // quien abre cinco páginas.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "desconocida";
  const hoy = new Date().toISOString().slice(0, 10);
  const sal = process.env.ADMIN_TOKEN ?? "sal-por-defecto";
  const huella = createHash("sha256")
    .update(`${sal}:${hoy}:${ip}`)
    .digest("hex")
    .slice(0, 32);

  try {
    await Promise.all([
      query(
        `INSERT INTO visita_dia (fecha, ruta, visitas) VALUES (current_date, $1, 1)
         ON CONFLICT (fecha, ruta) DO UPDATE SET visitas = visita_dia.visitas + 1`,
        [ruta]
      ),
      query(
        `INSERT INTO visitante_dia (fecha, huella) VALUES (current_date, $1)
         ON CONFLICT DO NOTHING`,
        [huella]
      ),
      query(
        `INSERT INTO referido_dia (fecha, origen, visitas) VALUES (current_date, $1, 1)
         ON CONFLICT (fecha, origen) DO UPDATE SET visitas = referido_dia.visitas + 1`,
        [origen]
      ),
    ]);
  } catch {
    // Una visita no contada no es motivo para devolver un error al navegador.
  }

  return new NextResponse(null, { status: 204 });
}
