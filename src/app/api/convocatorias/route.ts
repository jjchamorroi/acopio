import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { listarConvocatorias, obtenerConvocatoria } from "@/lib/consultas";
import { invalidarCache } from "@/lib/cache";
import { esquemaConvocatoriaNueva } from "@/lib/tipos";
import { generarToken, hashToken, esAdmin } from "@/lib/tokens";
import { validarUbicacionEnCiudad } from "@/lib/validacion-ubicacion";
import { consumirLimite, respuesta429 } from "@/lib/limite";

export const dynamic = "force-dynamic";

const MAX_CONVOCATORIAS_POR_HORA = 5;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const convocatorias = await listarConvocatorias({
    ciudad: searchParams.get("ciudad") ?? undefined,
    incluirPasadas: searchParams.get("pasadas") === "1" && esAdmin(req),
  });
  return NextResponse.json(
    { convocatorias },
    { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=60" } }
  );
}

export async function POST(req: Request) {
  if (!esAdmin(req)) {
    const limite = await consumirLimite(
      req,
      "crear-convocatoria",
      MAX_CONVOCATORIAS_POR_HORA,
      3600
    );
    if (!limite.permitido) {
      return respuesta429(limite, "Demasiadas convocatorias desde esta conexión");
    }
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = esquemaConvocatoriaNueva.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // Una convocatoria que ya terminó no la puede ver nadie: publicarla sería
  // dejar entrar ruido a un listado cuyo valor es que todo lo que aparece
  // sigue vigente.
  if (Date.parse(d.termina) < Date.now()) {
    return NextResponse.json(
      { error: "La convocatoria ya terminó. Revisá la fecha." },
      { status: 400 }
    );
  }

  const incoherencia = await validarUbicacionEnCiudad(
    d.ciudad_slug,
    d.lat,
    d.lng
  );
  if (incoherencia) {
    return NextResponse.json({ error: incoherencia }, { status: 400 });
  }

  const token = generarToken();

  let id: string;
  try {
    const { rows } = await getPool().query(
      `INSERT INTO convocatoria
         (centro_id, titulo, descripcion, ciudad_slug, lugar_encuentro,
          lat, lng, inicia, termina, cupo, que_llevar, requisitos,
          con_riesgo, contacto, telefono, admin_token_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [
        d.centro_id || null,
        d.titulo,
        d.descripcion,
        d.ciudad_slug,
        d.lugar_encuentro,
        d.lat,
        d.lng,
        d.inicia,
        d.termina,
        d.cupo ?? null,
        d.que_llevar || null,
        d.requisitos || null,
        d.con_riesgo ?? false,
        d.contacto || null,
        d.telefono || null,
        hashToken(token),
      ]
    );
    id = rows[0].id as string;
    invalidarCache();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    if (msg.includes("convocatoria_ciudad_slug_fkey")) {
      return NextResponse.json({ error: "Ciudad no válida" }, { status: 400 });
    }
    if (msg.includes("convocatoria_centro_id_fkey")) {
      return NextResponse.json({ error: "El lugar no existe" }, { status: 400 });
    }
    console.error("Error creando convocatoria:", msg);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }

  const convocatoria = await obtenerConvocatoria(id);
  return NextResponse.json({ id, token, convocatoria }, { status: 201 });
}
