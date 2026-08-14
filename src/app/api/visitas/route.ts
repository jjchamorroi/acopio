import { NextResponse } from "next/server";
import { resumenVisitas } from "@/lib/consultas";
import { esAdmin } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/** Las cifras de audiencia son internas: no se publican. */
export async function GET(req: Request) {
  if (!esAdmin(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json(await resumenVisitas());
}
