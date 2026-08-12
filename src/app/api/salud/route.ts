import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Healthcheck para Railway, Docker y Dokploy.
 *
 * Comprueba la conexión a la base, NO que el esquema esté aplicado. La
 * distinción importa: si exigiéramos que las tablas existan, el primer
 * despliegue de una instalación nueva nunca podría pasar el healthcheck
 * —porque el esquema se aplica después de que el servicio esté en pie— y el
 * despliegue quedaría bloqueado para siempre.
 *
 * Sí comprueba la base de verdad y no solo que el proceso viva: una app que
 * responde pero no llega a Postgres está caída para el usuario, y el
 * orquestador tiene que enterarse.
 */
export async function GET() {
  try {
    await query("SELECT 1");
  } catch (err) {
    console.error("Healthcheck: sin conexión a la base:", err);
    return NextResponse.json(
      {
        ok: false,
        base: "sin conexión",
        ayuda:
          "Revisa que DATABASE_URL apunte a la base y que esté levantada.",
      },
      { status: 503 }
    );
  }

  // A partir de acá la app está sana. El estado del esquema es información
  // útil para diagnosticar, pero no puede tumbar el despliegue.
  try {
    const filas = await query<{ acopios: number }>(
      "SELECT count(*)::int AS acopios FROM centro_acopio"
    );
    return NextResponse.json({
      ok: true,
      base: "conectada",
      esquema: "aplicado",
      acopios: filas[0].acopios,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      base: "conectada",
      esquema: "pendiente",
      ayuda: 'Falta aplicar db/schema.sql. Corré: npm run db:setup',
    });
  }
}
