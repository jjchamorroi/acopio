"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import { categoria as buscarCategoria } from "@/lib/categorias";
import { tipoLugar } from "@/lib/tipos-lugar";
import type { CentroPublico } from "@/lib/tipos";

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
        const tipo = tipoLugar(c.tipo);
        const urgentes = c.necesidades.filter((n) => n.nivel === "urgente");

        // El relleno dice QUÉ es el lugar; el borde rojo, que algo le urge.
        // Así el mapa comunica las dos cosas sin necesidad de leer nada.
        const tieneUrgencia = urgentes.length > 0;

        return (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={tieneUrgencia ? 11 : 9}
            pathOptions={{
              color: tieneUrgencia ? "#dc2626" : "#ffffff",
              weight: tieneUrgencia ? 3 : 2,
              fillColor: tipo?.color ?? "#475569",
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="space-y-2">
                <div>
                  <span
                    className="mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: tipo?.color ?? "#475569" }}
                  >
                    {tipo?.emoji} {tipo?.corto ?? c.tipo}
                  </span>
                  <p className="font-semibold text-slate-900">{c.nombre}</p>
                  <p className="text-slate-600">{c.direccion}</p>
                </div>

                {c.tipo === "albergue" && (
                  <p
                    className={
                      c.acepta_mascotas === true
                        ? "rounded bg-emerald-50 px-2 py-1 text-emerald-800"
                        : c.acepta_mascotas === false
                          ? "rounded bg-slate-100 px-2 py-1 text-slate-700"
                          : "rounded bg-amber-50 px-2 py-1 text-amber-800"
                    }
                  >
                    {c.acepta_mascotas === true
                      ? "🐾 Acepta mascotas"
                      : c.acepta_mascotas === false
                        ? "🚫 No recibe mascotas"
                        : "🐾 Mascotas: preguntá al llamar"}
                  </p>
                )}

                {c.estado === "pendiente" && (
                  <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                    Sin verificar — confirmá por teléfono antes de ir.
                  </p>
                )}
                {c.es_demo && (
                  <p className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                    Dato de prueba, no es un lugar real.
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
