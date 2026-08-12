"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const SelectorUbicacion = dynamic(() => import("./SelectorUbicacion"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-sm text-slate-500">
      Cargando mapa…
    </div>
  ),
});

type Sugerencia = { etiqueta: string; lat: number; lng: number };

/**
 * Mapa para marcar un punto, con dos ayudas.
 *
 * 1. Buscar una dirección para CENTRAR el mapa. Nunca coloca el punto sola:
 *    con la nomenclatura colombiana el buscador falla feo —"Carrera 24 #73-38"
 *    en Bogotá devolvió un sitio a 14 km— así que solo acerca la vista y la
 *    persona marca.
 *
 * 2. Decir en voz alta qué hay donde marcó: "Calle 20, El Jardín, Pereira".
 *    Esto es lo que caza el error humano en el momento en que ocurre, que es
 *    infinitamente mejor que descubrirlo cuando alguien ya manejó hasta allá.
 */
export default function AsistenteUbicacion({
  valor,
  centroInicial,
  ciudadNombre,
  onCambio,
}: {
  valor: { lat: number; lng: number } | null;
  centroInicial: [number, number];
  ciudadNombre?: string;
  onCambio: (lat: number, lng: number) => void;
}) {
  const [centro, setCentro] = useState<[number, number]>(centroInicial);
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [sinResultados, setSinResultados] = useState(false);

  const [ubicacion, setUbicacion] = useState<string | null>(null);
  const [consultandoUbicacion, setConsultandoUbicacion] = useState(false);

  // Si cambia la ciudad del formulario, el mapa la sigue.
  const ciudadRef = useRef(centroInicial.join(","));
  useEffect(() => {
    const clave = centroInicial.join(",");
    if (ciudadRef.current !== clave) {
      ciudadRef.current = clave;
      setCentro(centroInicial);
    }
  }, [centroInicial]);

  // Traducción inversa del punto marcado, con una pausa para no consultar en
  // cada micro-ajuste del pin.
  useEffect(() => {
    if (!valor) {
      setUbicacion(null);
      return;
    }
    let vivo = true;
    setConsultandoUbicacion(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geo?modo=inverso&lat=${valor.lat}&lng=${valor.lng}`
        );
        const { ubicacion } = await res.json();
        if (vivo) setUbicacion(ubicacion?.descripcion ?? null);
      } catch {
        if (vivo) setUbicacion(null);
      } finally {
        if (vivo) setConsultandoUbicacion(false);
      }
    }, 700);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [valor]);

  async function buscar() {
    if (texto.trim().length < 3) return;
    setBuscando(true);
    setSinResultados(false);
    setSugerencias([]);
    try {
      const res = await fetch(
        `/api/geo?modo=buscar&q=${encodeURIComponent(texto)}` +
          (ciudadNombre ? `&ciudad=${encodeURIComponent(ciudadNombre)}` : "")
      );
      const { sugerencias } = await res.json();
      setSugerencias(sugerencias ?? []);
      setSinResultados((sugerencias ?? []).length === 0);
    } catch {
      setSinResultados(true);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Sin esto, Enter envía el formulario entero a medio llenar.
              e.preventDefault();
              buscar();
            }
          }}
          placeholder="Buscar una calle o un lugar para acercar el mapa…"
        />
        <button
          type="button"
          onClick={buscar}
          disabled={buscando || texto.trim().length < 3}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {sugerencias.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white text-sm">
          {sugerencias.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  setCentro([s.lat, s.lng]);
                  setSugerencias([]);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
              >
                {s.etiqueta}
              </button>
            </li>
          ))}
        </ul>
      )}

      {sinResultados && (
        <p className="text-xs text-slate-500">
          No se encontró. Busca una calle o un punto de referencia cercano
          (un parque, una iglesia) y de ahí marca a mano.
        </p>
      )}

      <p className="text-xs text-slate-500">
        La búsqueda solo acerca el mapa. <strong>El punto lo marcas tú</strong>{" "}
        tocando el mapa: es lo que después usa el navegador de quien vaya.
      </p>

      <SelectorUbicacion valor={valor} centro={centro} onCambio={onCambio} />

      {valor && (
        <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
          {consultandoUbicacion ? (
            <span className="text-slate-500">Comprobando la ubicación…</span>
          ) : ubicacion ? (
            <>
              <span className="text-slate-600">Marcaste en: </span>
              <strong className="text-slate-900">{ubicacion}</strong>
              <span className="mt-0.5 block text-xs text-slate-500">
                Si esto no coincide con la dirección que escribiste, corrige el
                punto antes de continuar.
              </span>
            </>
          ) : (
            <span className="text-slate-600">
              Punto marcado. No pudimos identificar la zona automáticamente —
              revisa que sea el sitio correcto.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
