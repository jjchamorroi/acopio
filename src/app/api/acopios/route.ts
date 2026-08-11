import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { listarCentros } from "@/lib/consultas";
import { esquemaCentroNuevo } from "@/lib/tipos";
import { generarToken, hashToken, esAdmin } from "@/lib/tokens";
import {
  consumirLimite,
  limpiarLimitesVencidos,
  respuesta429,
} from "@/lib/limite";

export const dynamic = "force-dynamic";

// Cinco acopios por hora desde la misma conexión. Un caso legítimo —alguien de
// una alcaldía cargando varios puntos— cabe de sobra; un script que quiera
// llenar el mapa de basura, no. Si a alguien real se le queda corto, que nos
// escriba: es preferible eso a un mapa contaminado en plena emergencia.
const MAX_REGISTROS_POR_HORA = 5;
const VENTANA_SEGUNDOS = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const centros = await listarCentros({
    ciudad: searchParams.get("ciudad") ?? undefined,
    categoria: searchParams.get("categoria") ?? undefined,
    incluirCerrados: searchParams.get("todos") === "1" && esAdmin(req),
  });
  return NextResponse.json({ centros });
}

export async function POST(req: Request) {
  // El límite se consume antes de mirar el cuerpo: si no, un atacante puede
  // hacernos parsear y validar miles de peticiones gratis.
  if (!esAdmin(req)) {
    const limite = await consumirLimite(
      req,
      "crear-acopio",
      MAX_REGISTROS_POR_HORA,
      VENTANA_SEGUNDOS
    );
    if (!limite.permitido) {
      return respuesta429(
        limite,
        "Demasiados acopios registrados desde esta conexión"
      );
    }
  }

  // Limpieza oportunista de contadores vencidos, sin bloquear la respuesta.
  if (Math.random() < 0.02) void limpiarLimitesVencidos();

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = esquemaCentroNuevo.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const token = generarToken();
  const cliente = await getPool().connect();
  try {
    await cliente.query("BEGIN");

    const { rows } = await cliente.query(
      `INSERT INTO centro_acopio
         (nombre, direccion, ciudad_slug, lat, lng, responsable, telefono,
          horario, notas, admin_token_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        d.nombre,
        d.direccion,
        d.ciudad_slug,
        d.lat,
        d.lng,
        d.responsable || null,
        d.telefono || null,
        d.horario || null,
        d.notas || null,
        hashToken(token),
      ]
    );
    const id = rows[0].id as string;

    for (const n of d.necesidades) {
      await cliente.query(
        `INSERT INTO necesidad (centro_id, categoria, nivel, detalle)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (centro_id, categoria)
         DO UPDATE SET nivel = EXCLUDED.nivel,
                       detalle = EXCLUDED.detalle,
                       actualizado_en = now()`,
        [id, n.categoria, n.nivel, n.detalle || null]
      );
    }

    await cliente.query("COMMIT");

    // El token viaja una sola vez, en esta respuesta. Después solo queda el hash.
    return NextResponse.json({ id, token }, { status: 201 });
  } catch (err) {
    await cliente.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : "Error desconocido";
    // Ciudad inexistente -> violación de llave foránea.
    if (msg.includes("centro_acopio_ciudad_slug_fkey")) {
      return NextResponse.json({ error: "Ciudad no válida" }, { status: 400 });
    }
    console.error("Error creando acopio:", msg);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  } finally {
    cliente.release();
  }
}
