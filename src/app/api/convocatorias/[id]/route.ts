import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { obtenerConvocatoria } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { esquemaConvocatoriaActualizacion } from "@/lib/tipos";

import { autorizarConvocatoria } from "@/lib/autorizacion";
import { esAdmin } from "@/lib/tokens";

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

/**
 * Borrado definitivo. SOLO el equipo.
 *
 * Si ya hay gente apuntada exige confirmación explícita: borrar arrastra sus
 * inscripciones y quien organiza pierde los teléfonos para avisarles que no
 * vayan. Cancelar es casi siempre lo correcto — la convocatoria queda
 * marcada como cancelada y la lista de contactos sobrevive.
 */
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
      { error: "Solo el equipo puede eliminar una convocatoria" },
      { status: 403 }
    );
  }

  const forzar = new URL(req.url).searchParams.get("forzar") === "1";

  const { rows } = await getPool().query(
    `SELECT count(*)::int AS n FROM inscripcion
      WHERE convocatoria_id = $1 AND estado = 'confirmada'`,
    [id]
  );
  const inscritos = rows[0]?.n ?? 0;

  if (inscritos > 0 && !forzar) {
    return NextResponse.json(
      {
        error: `Hay ${inscritos} ${inscritos === 1 ? "persona apuntada" : "personas apuntadas"}`,
        detalle:
          "Si la borras pierdes sus teléfonos y no vas a poder avisarles que no vayan. Cancelarla es casi siempre lo correcto.",
        inscritos,
      },
      { status: 409 }
    );
  }

  const { rowCount } = await getPool().query(
    "DELETE FROM convocatoria WHERE id = $1",
    [id]
  );
  if (rowCount === 0) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  invalidarCache();
  return NextResponse.json({ eliminado: true });
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

  let rowCount: number | null = 0;
  try {
    ({ rowCount } = await getPool().query(
      `UPDATE convocatoria SET ${campos.join(", ")}, actualizado_en = now()
        WHERE id = $${valores.length}`,
      valores
    ));
  } catch (err) {
    // 23514 = violación de CHECK. El único de esta tabla es termina > inicia,
    // y se dispara cuando se edita una sola de las dos fechas. Sin este
    // manejo, el usuario recibe un 500 con el cuerpo vacío: un fallo mudo
    // justo cuando está corrigiendo un horario.
    if ((err as { code?: string }).code === "23514") {
      return NextResponse.json(
        {
          error: "La convocatoria no puede terminar antes de empezar",
          detalle: "Revisa las dos fechas: la de fin quedó antes que la de inicio.",
        },
        { status: 400 }
      );
    }
    console.error("Error actualizando convocatoria:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }

  if (rowCount === 0) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  invalidarCache();
  const convocatoria = await obtenerConvocatoria(id);
  return NextResponse.json({ convocatoria });
}
