"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import { categoria as buscarCategoria } from "@/lib/categorias";
import type { CentroPublico } from "@/lib/tipos";

/** El color del pin comunica lo único que importa de un vistazo: qué tan mal está. */
function colorDe(centro: CentroPublico) {
  if (centro.necesidades.some((n) => n.nivel === "urgente")) return "#dc2626";
  if (centro.necesidades.some((n) => n.nivel === "necesita")) return "#f59e0b";
  return "#0891b2";
}

export default function MapaAcopios({
  centros,
  centro,
  zoom = 12,
}: {
  centros: CentroPublico[];
  centro: [number, number];
  zoom?: number;
}) {
  return (
    <MapContainer
      center={centro}
      zoom={zoom}
      scrollWheelZoom
      className="h-[60vh] min-h-[380px] w-full rounded-lg border border-slate-200"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      {centros.map((c) => {
        const color = colorDe(c);
        const urgentes = c.necesidades.filter((n) => n.nivel === "urgente");
        return (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={10}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: color,
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="space-y-2">
                <div>
                  <p className="font-semibold text-slate-900">{c.nombre}</p>
                  <p className="text-slate-600">{c.direccion}</p>
                </div>

                {c.estado === "pendiente" && (
                  <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                    Sin verificar — confirmá por teléfono antes de ir.
                  </p>
                )}
                {c.es_demo && (
                  <p className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                    Dato de prueba, no es un acopio real.
                  </p>
                )}

                {urgentes.length > 0 && (
                  <div>
                    <p className="font-medium text-red-700">Necesita urgente:</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {urgentes.map((n) => {
                        const cat = buscarCategoria(n.categoria);
                        return (
                          <li key={n.categoria}>
                            {cat?.emoji} {cat?.label ?? n.categoria}
                            {n.detalle ? ` — ${n.detalle}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {c.telefono && (
                  <p>
                    <a
                      href={`tel:${c.telefono.replace(/\s/g, "")}`}
                      className="font-medium text-blue-700 underline"
                    >
                      {c.telefono}
                    </a>
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <Link
                    href={`/acopio/${c.id}`}
                    className="font-medium text-blue-700 underline"
                  >
                    Ver detalle
                  </Link>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-700 underline"
                  >
                    Cómo llegar
                  </a>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
