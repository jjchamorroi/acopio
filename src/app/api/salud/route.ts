import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Healthcheck para Docker y para Dokploy. Comprueba la base de verdad, no solo
 * que el proceso esté vivo: una app que responde pero no llega a Postgres está
 * caída para el usuario, y el orquestador tiene que enterarse.
 */
export async function GET() {
  try {
    const filas = await query<{ acopios: number }>(
      "SELECT count(*)::int AS acopios FROM centro_acopio"
    );
    return NextResponse.json({ ok: true, acopios: filas[0].acopios });
  } catch (err) {
    console.error("Healthcheck falló:", err);
    return NextResponse.json(
      { ok: false, error: "Sin conexión a la base de datos" },
      { status: 503 }
    );
  }
}
