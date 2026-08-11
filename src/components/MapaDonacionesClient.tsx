"use client";

import dynamic from "next/dynamic";
import type { DonacionPublica } from "@/lib/tipos";

const MapaDonaciones = dynamic(() => import("./MapaDonaciones"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[55vh] min-h-[340px] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500">
      Cargando mapa…
    </div>
  ),
});

export default function MapaDonacionesClient(props: {
  donaciones: DonacionPublica[];
  centro: [number, number];
  zoom?: number;
}) {
  return <MapaDonaciones {...props} />;
}
