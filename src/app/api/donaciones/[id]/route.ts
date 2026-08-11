import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { obtenerDonacion } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { esquemaDonacionActualizacion } from "@/lib/tipos";
import { hashToken, tokensCoinciden, esAdmin } from "@/lib/tokens";
import { consumirLimite, respuesta429 } from "@/lib/limite";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EDICIONES_POR_HORA = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  const donacion = await obtenerDonacion(id);
  if (!donacion) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ donacion });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  if (!esAdmin(req)) {
    const limite = await consumirLimite(
      req,
      "editar-donacion",
      MAX_EDICIONES_POR_HORA,
      3600
    );
    if (!limite.permitido) {
      return respuesta429(limite, "Demasiadas ediciones desde esta conexión");
    }

    const tokenRecibido = req.headers.get("x-acopio-token") ?? "";
    if (!tokenRecibido) {
      return NextResponse.json({ error: "Falta el token" }, { status: 401 });
    }
    const filas = await query<{ admin_token_hash: string }>(
      "SELECT admin_token_hash FROM donacion WHERE id = $1",
      [id]
    );
    if (filas.length === 0) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    if (!tokensCoinciden(hashToken(tokenRecibido), filas[0].admin_token_hash)) {
      return NextResponse.json({ error: "Token inválido" }, { status: 403 });
    }
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = esquemaDonacionActualizacion.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const campos: string[] = [];
  const valores: unknown[] = [];
  for (const campo of [
    "estado",
    "descripcion",
    "cantidad",
    "telefono",
    "notas",
  ] as const) {
    if (d[campo] !== undefined) {
      valores.push(d[campo] || null);
      campos.push(`${campo} = $${valores.length}`);
    }
  }

  if (campos.length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  valores.push(id);
  const { rowCount } = await getPool().query(
    `UPDATE donacion SET ${campos.join(", ")}, actualizado_en = now()
      WHERE id = $${valores.length}`,
    valores
  );
  if (rowCount === 0) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  invalidarCache();

  const donacion = await obtenerDonacion(id);
  return NextResponse.json({ donacion });
}
