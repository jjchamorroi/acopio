import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { listarProfesionales } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { esquemaProfesionalNuevo } from "@/lib/tipos";
import { generarToken, hashToken, esAdmin } from "@/lib/tokens";
import { consumirLimite, respuesta429 } from "@/lib/limite";

export const dynamic = "force-dynamic";

const MAX_POR_HORA = 3;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const profesionales = await listarProfesionales({
    profesion: searchParams.get("profesion") ?? undefined,
    ciudad: searchParams.get("ciudad") ?? undefined,
    modalidad: searchParams.get("modalidad") ?? undefined,
    incluirCerrados: searchParams.get("todos") === "1" && esAdmin(req),
  });
  return NextResponse.json(
    { profesionales },
    { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=60" } }
  );
}

export async function POST(req: Request) {
  // Tres por hora y no cinco: registrar profesionales falsos es más dañino
  // que registrar acopios falsos, y nadie legítimo necesita más.
  if (!esAdmin(req)) {
    const limite = await consumirLimite(req, "crear-profesional", MAX_POR_HORA, 3600);
    if (!limite.permitido) {
      return respuesta429(limite, "Demasiados registros desde esta conexión");
    }
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = esquemaProfesionalNuevo.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Quien atiende presencialmente tiene que decir dónde: sin ciudad no hay
  // forma de que alguien sepa si le sirve.
  if (d.modalidad !== "remoto" && !d.ciudad_slug) {
    return NextResponse.json(
      { error: "Indicá el municipio donde podés atender presencialmente" },
      { status: 400 }
    );
  }

  const token = generarToken();

  let id: string;
  try {
    const { rows } = await getPool().query(
      `INSERT INTO profesional
         (nombre, profesion, registro, descripcion, modalidad, ciudad_slug,
          disponibilidad, telefono, telefono_publico, email, admin_token_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        d.nombre,
        d.profesion,
        d.registro || null,
        d.descripcion,
        d.modalidad,
        d.ciudad_slug || null,
        d.disponibilidad || null,
        d.telefono,
        d.telefono_publico,
        d.email || null,
        hashToken(token),
      ]
    );
    id = rows[0].id as string;
    invalidarCache();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    if (msg.includes("profesional_ciudad_slug_fkey")) {
      return NextResponse.json({ error: "Ciudad no válida" }, { status: 400 });
    }
    console.error("Error registrando profesional:", msg);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }

  return NextResponse.json({ id, token }, { status: 201 });
}
