import { NextResponse } from "next/server";
import { getPool, query } from "@/lib/db";
import { obtenerCentro } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { esquemaActualizacion } from "@/lib/tipos";
import { hashToken, tokensCoinciden, esAdmin } from "@/lib/tokens";
import { consumirLimite, respuesta429 } from "@/lib/limite";
import { instantanea, describirCambio } from "@/lib/cambios";
import { tipoLugar } from "@/lib/tipos-lugar";

export const dynamic = "force-dynamic";

// Un acopio real actualiza sus necesidades varias veces al día, no sesenta
// veces por hora. Este techo no le estorba a nadie legítimo y sí le corta las
// piernas a quien intente adivinar tokens a fuerza bruta.
const MAX_EDICIONES_POR_HORA = 60;
const VENTANA_SEGUNDOS = 3600;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  const centro = await obtenerCentro(id);
  if (!centro) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ centro });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const admin = esAdmin(req);

  // Autorización: o es el admin, o trae el token que se le entregó al acopio.
  if (!admin) {
    const limite = await consumirLimite(
      req,
      "editar-acopio",
      MAX_EDICIONES_POR_HORA,
      VENTANA_SEGUNDOS
    );
    if (!limite.permitido) {
      return respuesta429(limite, "Demasiadas ediciones desde esta conexión");
    }

    const tokenRecibido = req.headers.get("x-acopio-token") ?? "";
    if (!tokenRecibido) {
      return NextResponse.json({ error: "Falta el token" }, { status: 401 });
    }
    const filas = await query<{ admin_token_hash: string }>(
      "SELECT admin_token_hash FROM centro_acopio WHERE id = $1",
      [id]
    );
    if (filas.length === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
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

  const parsed = esquemaActualizacion.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Solo el admin puede marcar un acopio como verificado: si el propio
  // responsable pudiera hacerlo, el sello de verificación no valdría nada.
  if (d.estado === "verificado" && !admin) {
    return NextResponse.json(
      { error: "Solo un administrador puede verificar un acopio" },
      { status: 403 }
    );
  }

  // Se toma el estado previo ANTES de tocar nada: es lo que queda en el
  // historial y lo que se reescribe si hay que revertir.
  const centroAntes = await obtenerCentro(id);
  if (!centroAntes) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const antes = instantanea(centroAntes);

  const cliente = await getPool().connect();
  try {
    await cliente.query("BEGIN");

    const campos: string[] = [];
    const valores: unknown[] = [];

    // Cambiar el tipo cambia lo que el lugar HACE. Si quien edita no dijo
    // explícitamente si recibe o entrega, se toman los valores habituales del
    // tipo nuevo: si no, un acopio reclasificado como albergue seguiría sin
    // aparecer para quien busca dónde dormir.
    if (d.tipo !== undefined && d.tipo !== centroAntes.tipo) {
      const porDefecto = tipoLugar(d.tipo);
      valores.push(d.tipo);
      campos.push(`tipo = $${valores.length}`);

      if (d.recibe_donaciones === undefined && porDefecto) {
        valores.push(porDefecto.recibe);
        campos.push(`recibe_donaciones = $${valores.length}`);
      }
      if (d.entrega_ayuda === undefined && porDefecto) {
        valores.push(porDefecto.entrega);
        campos.push(`entrega_ayuda = $${valores.length}`);
      }
    }

    // Texto: la cadena vacía del formulario se guarda como NULL.
    for (const campo of ["telefono", "horario", "notas", "estado", "atiende"] as const) {
      if (d[campo] !== undefined) {
        valores.push(d[campo] || null);
        campos.push(`${campo} = $${valores.length}`);
      }
    }

    // Booleanos aparte: con `|| null` un `false` legítimo se guardaría como
    // NULL, y "no recibe donaciones" se volvería "no se sabe".
    for (const campo of [
      "recibe_donaciones",
      "entrega_ayuda",
      "acepta_mascotas",
    ] as const) {
      if (d[campo] !== undefined) {
        valores.push(d[campo]);
        campos.push(`${campo} = $${valores.length}`);
      }
    }
    if (campos.length > 0) {
      valores.push(id);
      const { rowCount } = await cliente.query(
        `UPDATE centro_acopio SET ${campos.join(", ")}, actualizado_en = now()
          WHERE id = $${valores.length}`,
        valores
      );
      if (rowCount === 0) {
        await cliente.query("ROLLBACK");
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      }
    }

    // Las necesidades se reemplazan completas: es lo que espera el panel,
    // donde el responsable ve la lista entera y la deja como está hoy.
    if (d.necesidades) {
      await cliente.query("DELETE FROM necesidad WHERE centro_id = $1", [id]);
      for (const n of d.necesidades) {
        await cliente.query(
          `INSERT INTO necesidad (centro_id, categoria, nivel, detalle)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (centro_id, categoria)
           DO UPDATE SET nivel = EXCLUDED.nivel, detalle = EXCLUDED.detalle`,
          [id, n.categoria, n.nivel, n.detalle || null]
        );
      }
      await cliente.query(
        "UPDATE centro_acopio SET actualizado_en = now() WHERE id = $1",
        [id]
      );
    }

    await cliente.query("COMMIT");
  } catch (err) {
    await cliente.query("ROLLBACK");
    console.error("Error actualizando acopio:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  } finally {
    cliente.release();
  }

  invalidarCache();

  const centro = await obtenerCentro(id);

  // El registro del cambio va fuera de la transacción y con su propio
  // try/catch: que falle el historial no puede deshacer una actualización que
  // el usuario ya dio por buena.
  if (centro) {
    try {
      const despues = instantanea(centro);
      const resumen = describirCambio(antes, despues);
      if (resumen !== "Sin cambios visibles") {
        await query(
          `INSERT INTO cambio (centro_id, autor, resumen, anterior)
           VALUES ($1, $2, $3, $4)`,
          [id, admin ? "admin" : "acopio", resumen, JSON.stringify(antes)]
        );
      }
    } catch (err) {
      console.error("No se pudo registrar el cambio en el historial:", err);
    }
  }

  return NextResponse.json({ centro });
}
