"use client";

import dynamic from "next/dynamic";
import type { CentroPublico } from "@/lib/tipos";

/**
 * Leaflet toca `window` al importarse, así que revienta si Next intenta
 * renderizarlo en el servidor. Este envoltorio lo carga solo en el navegador.
 */
const MapaAcopios = dynamic(() => import("./MapaAcopios"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] min-h-[380px] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500">
      Cargando mapa…
    </div>
  ),
});

export default function MapaClient(props: {
  centros: CentroPublico[];
  centro: [number, number];
  zoom?: number;
}) {
  return <MapaAcopios {...props} />;
}
