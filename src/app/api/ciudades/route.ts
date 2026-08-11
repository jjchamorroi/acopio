import { NextResponse } from "next/server";
import { listarCiudades } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export async function GET() {
  const ciudades = await listarCiudades();
  return NextResponse.json({ ciudades });
}
