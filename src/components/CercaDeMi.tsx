"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Pide la ubicación del navegador y reordena el mapa alrededor de la persona.
 *
 * Es lo que le faltaba a "necesito ayuda": alguien que no tiene dónde comer
 * hoy no necesita un mapa del país, necesita el comedor de su barrio. La
 * consulta geoespacial existía desde el primer día; lo que faltaba era
 * preguntarle a la persona dónde está.
 *
 * La ubicación NO se guarda en ningún lado: viaja en la URL, se usa para
 * ordenar por distancia y ahí muere. No queda registro de dónde estaba quien
 * pidió ayuda, que en una emergencia es justo lo que no hay que acumular.
 */
export default function CercaDeMi({ activo }: { activo: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function ubicar() {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite compartir la ubicación.");
      return;
    }
    setBuscando(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nuevos = new URLSearchParams(params.toString());
        nuevos.set("lat", pos.coords.latitude.toFixed(5));
        nuevos.set("lng", pos.coords.longitude.toFixed(5));
        // La ciudad deja de tener sentido cuando ordenamos por distancia real:
        // lo cercano puede estar en el municipio de al lado.
        nuevos.delete("ciudad");
        router.push(`/?${nuevos.toString()}`);
        setBuscando(false);
      },
      (err) => {
        setBuscando(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Podés elegir tu municipio en el filtro de abajo."
            : "No pudimos obtener tu ubicación. Elegí tu municipio en el filtro."
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }

  function limpiar() {
    const nuevos = new URLSearchParams(params.toString());
    nuevos.delete("lat");
    nuevos.delete("lng");
    router.push(`/?${nuevos.toString()}`);
  }

  if (activo) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
        <p className="text-sm text-emerald-900">
          <strong>Mostrando lo más cerca de vos</strong>, ordenado por distancia.
        </p>
        <button
          type="button"
          onClick={limpiar}
          className="ml-auto text-sm font-medium text-emerald-800 underline"
        >
          Ver todo el mapa
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={ubicar}
        disabled={buscando}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
      >
        <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
          <path d="M12 2a1 1 0 0 1 1 1v1.06A8.01 8.01 0 0 1 19.94 11H21a1 1 0 1 1 0 2h-1.06A8.01 8.01 0 0 1 13 19.94V21a1 1 0 1 1-2 0v-1.06A8.01 8.01 0 0 1 4.06 13H3a1 1 0 1 1 0-2h1.06A8.01 8.01 0 0 1 11 4.06V3a1 1 0 0 1 1-1Zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
        </svg>
        {buscando ? "Buscando tu ubicación…" : "Ver lo más cerca de mí"}
      </button>
      {error && (
        <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      )}
    </div>
  );
}
