import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { listarDonaciones, centrosCercanos } from "@/lib/consultas";
import { esquemaDonacionNueva } from "@/lib/tipos";
import { generarToken, hashToken, esAdmin } from "@/lib/tokens";
import { difuminarUbicacion } from "@/lib/privacidad";
import { consumirLimite, respuesta429 } from "@/lib/limite";

export const dynamic = "force-dynamic";

const MAX_DONACIONES_POR_HORA = 10;
const VENTANA_SEGUNDOS = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const donaciones = await listarDonaciones({
    ciudad: searchParams.get("ciudad") ?? undefined,
    categoria: searchParams.get("categoria") ?? undefined,
    incluirTodas: searchParams.get("todas") === "1" && esAdmin(req),
  });
  return NextResponse.json({ donaciones });
}

export async function POST(req: Request) {
  if (!esAdmin(req)) {
    const limite = await consumirLimite(
      req,
      "crear-donacion",
      MAX_DONACIONES_POR_HORA,
      VENTANA_SEGUNDOS
    );
    if (!limite.permitido) {
      return respuesta429(
        limite,
        "Demasiadas donaciones publicadas desde esta conexión"
      );
    }
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = esquemaDonacionNueva.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  // El punto que se publica se calcula acá, una sola vez, y se guarda.
  const aprox = difuminarUbicacion(d.lat, d.lng);
  const token = generarToken();

  let id: string;
  try {
    const { rows } = await getPool().query(
      `INSERT INTO donacion
         (categoria, descripcion, cantidad, ciudad_slug,
          lat, lng, lat_aprox, lng_aprox,
          contacto, telefono, notas, admin_token_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        d.categoria,
        d.descripcion,
        d.cantidad || null,
        d.ciudad_slug,
        d.lat,
        d.lng,
        aprox.lat,
        aprox.lng,
        d.contacto || null,
        d.telefono,
        d.notas || null,
        hashToken(token),
      ]
    );
    id = rows[0].id as string;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    if (msg.includes("donacion_ciudad_slug_fkey")) {
      return NextResponse.json({ error: "Ciudad no válida" }, { status: 400 });
    }
    console.error("Error creando donación:", msg);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }

  // El valor inmediato: decirle a la persona, ya mismo, a qué lugar cercano
  // le sirve justo eso. Muchos donantes pueden llevarlo ellos y no hace falta
  // que nadie lo recoja. Se calcula con la ubicación exacta —que no sale de
  // acá— para que la sugerencia sea buena de verdad.
  let sugerencias: Awaited<ReturnType<typeof centrosCercanos>> = [];
  try {
    sugerencias = await centrosCercanos(d.lat, d.lng, 25, d.categoria);
  } catch (err) {
    console.error("No se pudieron calcular sugerencias:", err);
  }

  return NextResponse.json(
    {
      id,
      token,
      sugerencias: sugerencias.slice(0, 5).map((c) => ({
        id: c.id,
        nombre: c.nombre,
        tipo: c.tipo,
        direccion: c.direccion,
        ciudad_nombre: c.ciudad_nombre,
        telefono: c.telefono,
        estado: c.estado,
        lat: c.lat,
        lng: c.lng,
        distancia_km: Number((c.distancia_m / 1000).toFixed(1)),
        nivel:
          c.necesidades.find((n) => n.categoria === d.categoria)?.nivel ?? null,
      })),
    },
    { status: 201 }
  );
}
