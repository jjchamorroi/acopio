"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import Link from "next/link";
import { categoria as buscarCategoria } from "@/lib/categorias";
import { tipoLugar } from "@/lib/tipos-lugar";
import type { CentroPublico, ConvocatoriaPublica } from "@/lib/tipos";
import { formatearFranja } from "./TarjetaConvocatoria";

/**
 * Mueve la vista cuando cambian el centro o el zoom.
 *
 * MapContainer solo mira `center` y `zoom` al montarse: son props de
 * inicialización, no reactivas. Sin esto, elegir una ciudad en el filtro
 * recargaba los puntos pero dejaba el mapa donde estaba, y el usuario tenía
 * que buscar a mano dónde habían aparecido.
 */
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
    // flyTo y no setView: el desplazamiento animado deja claro que el mapa se
    // movió a otro sitio, en vez de dar un salto que desorienta.
    map.flyTo([lat, lng], zoom, { duration: 0.8 });
  }, [map, lat, lng, zoom]);

  return null;
}

export default function MapaAcopios({
  centros,
  centro,
  zoom = 12,
  miUbicacion,
  convocatorias = [],
}: {
  centros: CentroPublico[];
  centro: [number, number];
  zoom?: number;
  /** Dónde está la persona, si compartió su ubicación. */
  miUbicacion?: [number, number];
  /** Jornadas de voluntariado, cuando el mapa está en ese modo. */
  convocatorias?: ConvocatoriaPublica[];
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

      <Recentrar centro={centro} zoom={zoom} />

      {miUbicacion && (
        <CircleMarker
          center={miUbicacion}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 3,
            fillColor: "#2563eb",
            fillOpacity: 1,
          }}
        >
          <Popup>Estás por acá</Popup>
        </CircleMarker>
      )}

      {/* Las convocatorias se dibujan distinto de los lugares a propósito: un
          lugar es algo que existe, una jornada es algo que pasa a una hora.
          Confundirlas en el mapa haría que alguien llegue un martes a un
          punto de encuentro que solo existió el sábado. */}
      {convocatorias.map((v) => {
        const faltan = v.cupo === null ? null : Math.max(0, v.cupo - v.inscritos);
        const lleno = faltan === 0;
        return (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={11}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              // Verde 142°: a 33° del teal de los albergues, que antes era idéntico.
              fillColor: lleno ? "#94a3b8" : "#15803d",
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="space-y-1.5">
                <p className="font-medium text-emerald-700">
                  {formatearFranja(v.inicia, v.termina)}
                </p>
                <p className="font-semibold text-slate-900">{v.titulo}</p>
                <p className="text-slate-600">{v.lugar_encuentro}</p>
                {v.con_riesgo && (
                  <p className="rounded bg-amber-50 px-2 py-1 text-amber-900">
                    ⚠ Trabajo con riesgo
                  </p>
                )}
                <p className="font-medium text-slate-900">
                  {faltan === null
                    ? `${v.inscritos} apuntados`
                    : lleno
                      ? "Cupo completo"
                      : `Faltan ${faltan} de ${v.cupo}`}
                </p>
                {v.que_llevar && (
                  <p className="text-slate-600">Lleva: {v.que_llevar}</p>
                )}
                <p>
                  <Link
                    href={`/convocatoria/${v.id}`}
                    className="font-medium text-blue-700 underline"
                  >
                    Ver y apuntarme
                  </Link>
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

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
                        : "🐾 Mascotas: pregunta al llamar"}
                  </p>
                )}

                {c.estado === "pendiente" && (
                  <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                    Sin verificar — confirma por teléfono antes de ir.
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
