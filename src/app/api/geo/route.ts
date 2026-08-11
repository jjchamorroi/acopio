import { NextResponse } from "next/server";
import { ubicacionDePunto, buscarDireccion } from "@/lib/geocodificacion";
import { consumirLimite, respuesta429 } from "@/lib/limite";

export const dynamic = "force-dynamic";

// Nominatim es un servicio comunitario gratuito. Este techo protege tanto la
// aplicación como el servicio de terceros del que dependemos.
const MAX_CONSULTAS_POR_HORA = 120;

/**
 * GET /api/geo?modo=inverso&lat=..&lng=..   -> qué hay en ese punto
 * GET /api/geo?modo=buscar&q=..&ciudad=..   -> candidatos para centrar el mapa
 */
export async function GET(req: Request) {
  const limite = await consumirLimite(
    req,
    "geo",
    MAX_CONSULTAS_POR_HORA,
    3600
  );
  if (!limite.permitido) {
    return respuesta429(limite, "Demasiadas consultas de ubicación");
  }

  const { searchParams } = new URL(req.url);
  const modo = searchParams.get("modo");

  if (modo === "inverso") {
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "lat y lng requeridos" },
        { status: 400 }
      );
    }
    const ubicacion = await ubicacionDePunto(lat, lng);
    return NextResponse.json({ ubicacion });
  }

  if (modo === "buscar") {
    const q = (searchParams.get("q") ?? "").trim();
    if (q.length < 3) {
      return NextResponse.json({ sugerencias: [] });
    }
    const sugerencias = await buscarDireccion(
      q.slice(0, 120),
      searchParams.get("ciudad") ?? undefined
    );
    return NextResponse.json({ sugerencias });
  }

  return NextResponse.json({ error: "modo inválido" }, { status: 400 });
}
