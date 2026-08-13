"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Popup,
  useMap,
} from "react-leaflet";
import { categoria as buscarCategoria } from "@/lib/categorias";
import { RADIO_DIFUSO_M } from "@/lib/constantes";
import type { DonacionPublica } from "@/lib/tipos";

/**
 * Las donaciones se dibujan como un círculo del tamaño real de la imprecisión,
 * no como un punto. Un punto sugeriría que ahí está exactamente la casa; el
 * círculo comunica de un vistazo "está en algún lugar de acá adentro", que es
 * la verdad.
 */
/** Ver la nota en MapaAcopios: center y zoom no son props reactivas. */
function Recentrar({
  centro,
  zoom,
}: {
  centro: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const [lat, lng] = centro;
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.8 });
  }, [map, lat, lng, zoom]);
  return null;
}

export default function MapaDonaciones({
  donaciones,
  centro,
  zoom = 12,
}: {
  donaciones: DonacionPublica[];
  centro: [number, number];
  zoom?: number;
}) {
  return (
    <MapContainer
      center={centro}
      zoom={zoom}
      scrollWheelZoom
      className="h-[55vh] min-h-[340px] w-full rounded-lg border border-slate-200"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <Recentrar centro={centro} zoom={zoom} />

      {donaciones.map((d) => {
        const cat = buscarCategoria(d.categoria);
        return (
          <Circle
            key={d.id}
            center={[d.lat_aprox, d.lng_aprox]}
            radius={RADIO_DIFUSO_M}
            pathOptions={{
              color: "#0f766e",
              weight: 2,
              fillColor: "#14b8a6",
              fillOpacity: 0.25,
            }}
          >
            <Popup maxWidth={280} maxHeight={220} autoPanPadding={[24, 24]}>
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-900">
                  <span aria-hidden>{cat?.emoji}</span> {d.descripcion}
                </p>
                {d.cantidad && (
                  <p className="text-slate-600">Cantidad: {d.cantidad}</p>
                )}
                <p className="text-slate-600">
                  {cat?.label ?? d.categoria} · {d.ciudad_nombre}
                </p>
                {d.notas && <p className="text-slate-600">{d.notas}</p>}
                <p className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                  Zona aproximada. La dirección exacta la da{" "}
                  {d.contacto ? d.contacto : "quien dona"} por teléfono.
                </p>
                <p>
                  <a
                    href={`tel:${d.telefono.replace(/\s/g, "")}`}
                    className="font-medium text-blue-700 underline"
                  >
                    Llamar {d.telefono}
                  </a>
                </p>
                {d.es_demo && (
                  <p className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                    Dato de prueba.
                  </p>
                )}
              </div>
            </Popup>
          </Circle>
        );
      })}
    </MapContainer>
  );
}
