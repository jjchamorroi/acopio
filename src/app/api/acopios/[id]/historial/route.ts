import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { obtenerCentro } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { autorizarLugar } from "@/lib/autorizacion";
import { instantanea, describirCambio, type Instantanea } from "@/lib/cambios";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Últimos cambios del lugar. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const auth = await autorizarLugar(req, id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cambios = await query(
    `SELECT id::text, autor, resumen, anterior, creado_en
       FROM cambio WHERE centro_id = $1
      ORDER BY creado_en DESC LIMIT 30`,
    [id]
  );

  return NextResponse.json({ cambios });
}

/**
 * Revertir: reescribe el estado que había antes del cambio indicado.
 *
 * No borra el historial ni "deshace" la fila: aplicar el estado anterior deja
 * a su vez un cambio nuevo. Así la secuencia completa queda auditable, incluso
 * la de quien revierte, que es justo lo que hace falta cuando alguien toca lo
 * que no debía.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const auth = await autorizarLugar(req, id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let cuerpo: { cambio_id?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const cambioId = String(cuerpo.cambio_id ?? "");
  if (!/^\d+$/.test(cambioId)) {
    return NextResponse.json({ error: "cambio_id inválido" }, { status: 400 });
  }

  const filas = await query<{ anterior: Instantanea }>(
    "SELECT anterior FROM cambio WHERE id = $1 AND centro_id = $2",
    [cambioId, id]
  );
  if (filas.length === 0) {
    return NextResponse.json({ error: "Cambio no encontrado" }, { status: 404 });
  }
  const objetivo = filas[0].anterior;

  // Un lugar no puede auto-verificarse ni siquiera revirtiendo: si el estado
  // guardado era 'verificado' y quien revierte no es del equipo, se restaura
  // como pendiente. Sin esto, el sello se podría recuperar por la puerta de
  // atrás revirtiendo a un momento en que estaba verificado.
  const estadoDestino =
    objetivo.estado === "verificado" && !auth.admin
      ? "pendiente"
      : objetivo.estado;

  const centroAntes = await obtenerCentro(id);
  if (!centroAntes) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const antes = instantanea(centroAntes);

  const cliente = await getPool().connect();
  try {
    await cliente.query("BEGIN");

    await cliente.query(
      `UPDATE centro_acopio
          SET telefono = $1, horario = $2, notas = $3, estado = $4,
              recibe_donaciones = $5, entrega_ayuda = $6, acepta_mascotas = $7,
              atiende = $8, tipo = COALESCE($9, tipo), tipos_sangre = $10,
              actualizado_en = now()
        WHERE id = $11`,
      [
        objetivo.telefono,
        objetivo.horario,
        objetivo.notas,
        estadoDestino,
        objetivo.recibe_donaciones,
        objetivo.entrega_ayuda,
        objetivo.acepta_mascotas,
        objetivo.atiende ?? null,
        objetivo.tipo ?? null,
        objetivo.tipos_sangre ?? null,
        id,
      ]
    );

    await cliente.query("DELETE FROM necesidad WHERE centro_id = $1", [id]);
    for (const n of objetivo.necesidades ?? []) {
      await cliente.query(
        `INSERT INTO necesidad (centro_id, categoria, nivel, detalle)
         VALUES ($1,$2,$3,$4) ON CONFLICT (centro_id, categoria) DO NOTHING`,
        [id, n.categoria, n.nivel, n.detalle]
      );
    }

    await cliente.query("COMMIT");
  } catch (err) {
    await cliente.query("ROLLBACK");
    console.error("Error revirtiendo:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  } finally {
    cliente.release();
  }

  invalidarCache();

  const centro = await obtenerCentro(id);
  if (centro) {
    try {
      const resumen = describirCambio(antes, instantanea(centro));
      await query(
        `INSERT INTO cambio (centro_id, autor, resumen, anterior)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          auth.admin ? "admin" : "acopio",
          `Reversión — ${resumen}`,
          JSON.stringify(antes),
        ]
      );
    } catch (err) {
      console.error("No se pudo registrar la reversión:", err);
    }
  }

  return NextResponse.json({ centro });
}
