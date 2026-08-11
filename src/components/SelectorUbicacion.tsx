"use client";

import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

function CapturarClick({
  onCambio,
}: {
  onCambio: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onCambio(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Recentra el mapa cuando el usuario cambia de ciudad en el formulario. */
function Recentrar({ centro }: { centro: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(centro, Math.max(map.getZoom(), 13));
  }, [centro, map]);
  return null;
}

export default function SelectorUbicacion({
  valor,
  centro,
  onCambio,
}: {
  valor: { lat: number; lng: number } | null;
  centro: [number, number];
  onCambio: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={centro}
      zoom={13}
      scrollWheelZoom
      className="h-72 w-full rounded-lg border border-slate-300"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <CapturarClick onCambio={onCambio} />
      <Recentrar centro={centro} />
      {valor && (
        <CircleMarker
          center={[valor.lat, valor.lng]}
          radius={11}
          pathOptions={{
            color: "#ffffff",
            weight: 3,
            fillColor: "#0f172a",
            fillOpacity: 0.9,
          }}
        />
      )}
    </MapContainer>
  );
}
