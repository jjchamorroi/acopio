import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { obtenerProfesional } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { esquemaProfesionalActualizacion } from "@/lib/tipos";
import { hashToken, tokensCoinciden, esAdmin } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function autorizar(req: Request, id: string) {
  if (esAdmin(req)) return { ok: true, admin: true };
  const recibido = req.headers.get("x-acopio-token") ?? "";
  if (!recibido) return { ok: false, admin: false };
  const filas = await query<{ admin_token_hash: string }>(
    "SELECT admin_token_hash FROM profesional WHERE id = $1",
    [id]
  );
  if (filas.length === 0) return { ok: false, admin: false };
  return {
    ok: tokensCoinciden(hashToken(recibido), filas[0].admin_token_hash),
    admin: false,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  const profesional = await obtenerProfesional(id);
  if (!profesional) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ profesional });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const auth = await autorizar(req, id);
  if (!auth.ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = esquemaProfesionalActualizacion.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // El sello lo pone el equipo. Si cada quien pudiera marcarse como
  // verificado, con profesiones de salud eso sería peligroso, no solo inútil.
  if (d.estado === "verificado" && !auth.admin) {
    return NextResponse.json(
      { error: "Solo el equipo puede verificar un profesional" },
      { status: 403 }
    );
  }

  const campos: string[] = [];
  const valores: unknown[] = [];

  for (const campo of [
    "descripcion",
    "modalidad",
    "disponibilidad",
    "telefono",
    "email",
    "registro",
    "estado",
  ] as const) {
    if (d[campo] !== undefined) {
      valores.push(d[campo] || null);
      campos.push(`${campo} = $${valores.length}`);
    }
  }
  // Booleano aparte: `|| null` convertiría un "no publicar" en NULL.
  if (d.telefono_publico !== undefined) {
    valores.push(d.telefono_publico);
    campos.push(`telefono_publico = $${valores.length}`);
  }

  if (campos.length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  valores.push(id);
  const { rowCount } = await getPool().query(
    `UPDATE profesional SET ${campos.join(", ")}, actualizado_en = now()
      WHERE id = $${valores.length}`,
    valores
  );
  if (rowCount === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  invalidarCache();
  const profesional = await obtenerProfesional(id);
  return NextResponse.json({ profesional });
}

/** Borrado definitivo, solo para el equipo. Ver la nota en /api/acopios. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  if (!esAdmin(req)) {
    return NextResponse.json(
      { error: "Solo el equipo puede eliminar un registro" },
      { status: 403 }
    );
  }

  const { rowCount } = await getPool().query(
    "DELETE FROM profesional WHERE id = $1",
    [id]
  );
  if (rowCount === 0) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  invalidarCache();
  return NextResponse.json({ eliminado: true });
}
