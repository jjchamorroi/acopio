import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerConvocatoria } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { esquemaConvocatoriaActualizacion } from "@/lib/tipos";

import { autorizarConvocatoria } from "@/lib/autorizacion";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  const convocatoria = await obtenerConvocatoria(id);
  if (!convocatoria) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ convocatoria });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  if (!(await autorizarConvocatoria(req, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = esquemaConvocatoriaActualizacion.safeParse(cuerpo);
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
    "titulo",
    "descripcion",
    "lugar_encuentro",
    "inicia",
    "termina",
    "que_llevar",
    "requisitos",
    "telefono",
    "estado",
  ] as const) {
    if (d[campo] !== undefined) {
      valores.push(d[campo] || null);
      campos.push(`${campo} = $${valores.length}`);
    }
  }

  // Aparte de los textos: un cupo 0 no existe, pero `false` y el número sí
  // se distinguen de "no enviado", y `|| null` los aplastaría.
  if (d.cupo !== undefined) {
    valores.push(d.cupo);
    campos.push(`cupo = $${valores.length}`);
  }
  if (d.con_riesgo !== undefined) {
    valores.push(d.con_riesgo);
    campos.push(`con_riesgo = $${valores.length}`);
  }

  if (campos.length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  valores.push(id);
  const { rowCount } = await getPool().query(
    `UPDATE convocatoria SET ${campos.join(", ")}, actualizado_en = now()
      WHERE id = $${valores.length}`,
    valores
  );
  if (rowCount === 0) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  invalidarCache();
  const convocatoria = await obtenerConvocatoria(id);
  return NextResponse.json({ convocatoria });
}
