import { NextResponse } from "next/server";
import { buscarCiudades } from "@/lib/consultas";

export const dynamic = "force-dynamic";

/** GET /api/ciudades?q=texto — autocompletado de municipios. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ciudades = await buscarCiudades(searchParams.get("q") ?? undefined);
  return NextResponse.json(
    { ciudades },
    { headers: { "cache-control": "public, s-maxage=600" } }
  );
}
