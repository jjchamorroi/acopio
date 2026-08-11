import { NextResponse } from "next/server";
import { centrosCercanos } from "@/lib/consultas";

export const dynamic = "force-dynamic";

/**
 * GET /api/cercanos?lat=4.81&lng=-75.69&radio=15&categoria=agua
 *
 * "Tengo esto para donar, ¿quién lo necesita cerca de mí?".
 * Esta consulta es la que después alimenta la asignación de rutas a voluntarios.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Parámetros lat y lng requeridos" },
      { status: 400 }
    );
  }

  const radioBruto = Number(searchParams.get("radio"));
  const radioKm = Number.isFinite(radioBruto)
    ? Math.min(Math.max(radioBruto, 1), 200)
    : 15;

  const centros = await centrosCercanos(
    lat,
    lng,
    radioKm,
    searchParams.get("categoria") ?? undefined
  );

  return NextResponse.json({ centros, radio_km: radioKm });
}
