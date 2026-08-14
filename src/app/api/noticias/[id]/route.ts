import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { invalidarCache } from "@/lib/cache";
import { esAdmin } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Editar un aviso. Solo el equipo.
 *
 * Acepta FormData igual que el POST, para poder reemplazar la imagen. Un campo
 * que no venga NO se toca: así se puede apagar un aviso sin tener que reenviar
 * su foto entera.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!esAdmin(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  let datos: FormData;
  try {
    datos = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const campos: string[] = [];
  const valores: unknown[] = [];

  const ponerTexto = (clave: string, columna: string, max: number) => {
    if (!datos.has(clave)) return;
    const v = String(datos.get(clave) ?? "").trim();
    valores.push(v ? v.slice(0, max) : null);
    campos.push(`${columna} = $${valores.length}`);
  };

  ponerTexto("titulo", "titulo", 160);
  ponerTexto("cuerpo", "cuerpo", 1200);
  ponerTexto("enlace", "enlace", 500);
  ponerTexto("enlace_texto", "enlace_texto", 60);
  ponerTexto("vence_en", "vence_en", 40);

  for (const [clave, columna] of [
    ["urgente", "urgente"],
    ["activa", "activa"],
  ] as const) {
    if (datos.has(clave)) {
      valores.push(datos.get(clave) === "1");
      campos.push(`${columna} = $${valores.length}`);
    }
  }

  if (datos.has("orden")) {
    valores.push(Number(datos.get("orden")) || 0);
    campos.push(`orden = $${valores.length}`);
  }

  const archivo = datos.get("imagen");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "La imagen supera los 2 MB" },
        { status: 400 }
      );
    }
    valores.push(Buffer.from(await archivo.arrayBuffer()));
    campos.push(`imagen = $${valores.length}`);
    valores.push(archivo.type);
    campos.push(`imagen_tipo = $${valores.length}`);
  } else if (datos.get("quitar_imagen") === "1") {
    campos.push("imagen = NULL", "imagen_tipo = NULL");
  }

  if (campos.length === 0) {
    return NextResponse.json({ error: "Nada que cambiar" }, { status: 400 });
  }

  valores.push(id);
  const { rowCount } = await getPool().query(
    `UPDATE noticia SET ${campos.join(", ")}, actualizado_en = now()
      WHERE id = $${valores.length}`,
    valores
  );

  if (rowCount === 0) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  invalidarCache();
  return NextResponse.json({ actualizada: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!esAdmin(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const { rowCount } = await getPool().query(
    "DELETE FROM noticia WHERE id = $1",
    [id]
  );
  if (rowCount === 0) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  invalidarCache();
  return NextResponse.json({ eliminada: true });
}
