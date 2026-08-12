import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { obtenerConvocatoria } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { esquemaInscripcion } from "@/lib/tipos";
import { generarToken, hashToken, tokensCoinciden } from "@/lib/tokens";
import { autorizarConvocatoria } from "@/lib/autorizacion";
import { consumirLimite, respuesta429 } from "@/lib/limite";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_INSCRIPCIONES_POR_HORA = 20;

/**
 * Lista de inscritos. SOLO para quien convoca o el equipo.
 *
 * Los datos de quien se ofrece a ayudar no son públicos: en el listado
 * abierto va únicamente el contador. Publicar estos teléfonos convertiría un
 * acto de solidaridad en una base de contactos abierta a cualquiera.
 */
export async function GET(
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

  const inscripciones = await query(
    `SELECT id, nombre, telefono, nota, estado, creado_en
       FROM inscripcion
      WHERE convocatoria_id = $1
      ORDER BY (estado = 'confirmada') DESC, creado_en`,
    [id]
  );

  return NextResponse.json({ inscripciones });
}

/** Apuntarse. Sin cuenta: devuelve un token para poder darse de baja. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const limite = await consumirLimite(
    req,
    "inscribirse",
    MAX_INSCRIPCIONES_POR_HORA,
    3600
  );
  if (!limite.permitido) {
    return respuesta429(limite, "Demasiadas inscripciones desde esta conexión");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = esquemaInscripcion.safeParse(cuerpo);
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

    // FOR UPDATE bloquea la fila de la convocatoria mientras dure la
    // transacción. Sin esto, dos personas apuntándose a la vez leerían el
    // mismo conteo y ambas pasarían el control de cupo: el último puesto se
    // vendería dos veces.
    const { rows: conv } = await cliente.query(
      `SELECT cupo, estado, termina FROM convocatoria WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (conv.length === 0) {
      await cliente.query("ROLLBACK");
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const c = conv[0];
    if (c.estado !== "abierta") {
      await cliente.query("ROLLBACK");
      return NextResponse.json(
        { error: "Esta convocatoria fue cancelada" },
        { status: 409 }
      );
    }
    if (new Date(c.termina).getTime() < Date.now()) {
      await cliente.query("ROLLBACK");
      return NextResponse.json(
        { error: "Esta convocatoria ya terminó" },
        { status: 409 }
      );
    }

    if (c.cupo !== null) {
      const { rows: cuenta } = await cliente.query(
        `SELECT count(*)::int AS n FROM inscripcion
          WHERE convocatoria_id = $1 AND estado = 'confirmada'`,
        [id]
      );
      if (cuenta[0].n >= c.cupo) {
        await cliente.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "El cupo ya está completo",
            detalle:
              "Mirá otras convocatorias: seguro hay más manos haciendo falta cerca.",
          },
          { status: 409 }
        );
      }
    }

    await cliente.query(
      `INSERT INTO inscripcion (convocatoria_id, nombre, telefono, nota, token_hash)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, d.nombre, d.telefono, d.nota || null, hashToken(token)]
    );

    await cliente.query("COMMIT");
  } catch (err) {
    await cliente.query("ROLLBACK");
    console.error("Error inscribiendo:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  } finally {
    cliente.release();
  }

  invalidarCache();
  const convocatoria = await obtenerConvocatoria(id);
  return NextResponse.json({ token, convocatoria }, { status: 201 });
}

/** Darse de baja con el token que se entregó al apuntarse. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const recibido = req.headers.get("x-inscripcion-token") ?? "";
  if (!recibido) {
    return NextResponse.json({ error: "Falta el token" }, { status: 401 });
  }

  const filas = await query<{ id: string; token_hash: string }>(
    `SELECT id, token_hash FROM inscripcion
      WHERE convocatoria_id = $1 AND estado = 'confirmada'`,
    [id]
  );

  const hash = hashToken(recibido);
  const propia = filas.find((f) => tokensCoinciden(hash, f.token_hash));
  if (!propia) {
    return NextResponse.json({ error: "Token inválido" }, { status: 403 });
  }

  await query("UPDATE inscripcion SET estado = 'cancelada' WHERE id = $1", [
    propia.id,
  ]);

  invalidarCache();
  const convocatoria = await obtenerConvocatoria(id);
  return NextResponse.json({ convocatoria });
}
