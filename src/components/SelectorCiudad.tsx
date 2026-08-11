"use client";

import { useEffect, useRef, useState } from "react";
import type { Ciudad } from "@/lib/tipos";

/**
 * Autocompletado de municipios.
 *
 * Con 1.122 municipios, un <select> es inusable —sobre todo en celular, que es
 * donde va a estar casi toda la gente— y mandar la lista entera en cada carga
 * de página serían decenas de kilobytes por visita. Acá se escribe y el
 * servidor devuelve como mucho 25 coincidencias.
 *
 * Sin texto muestra los municipios de las zonas afectadas, que es lo que casi
 * siempre se busca.
 */
export default function SelectorCiudad({
  valor,
  onCambio,
  requerido = false,
}: {
  valor: Ciudad | null;
  onCambio: (ciudad: Ciudad | null) => void;
  requerido?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [opciones, setOpciones] = useState<Ciudad[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    setCargando(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ciudades?q=${encodeURIComponent(texto.trim())}`
        );
        const { ciudades } = await res.json();
        if (vivo) {
          setOpciones(ciudades ?? []);
          setResaltado(0);
        }
      } catch {
        if (vivo) setOpciones([]);
      } finally {
        if (vivo) setCargando(false);
      }
    }, 220);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [texto, abierto]);

  // Cerrar al tocar fuera. Sin esto la lista queda flotando sobre el mapa.
  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function elegir(c: Ciudad) {
    onCambio(c);
    setTexto("");
    setAbierto(false);
  }

  return (
    <div ref={contenedor} className="relative">
      {valor && !abierto ? (
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            setTexto("");
          }}
          className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
        >
          <span>
            <strong className="text-slate-900">{valor.nombre}</strong>
            <span className="text-slate-500"> — {valor.departamento}</span>
          </span>
          <span className="text-xs text-blue-700">Cambiar</span>
        </button>
      ) : (
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          value={texto}
          autoComplete="off"
          required={requerido && !valor}
          placeholder="Escribí el municipio: Ibagué, Quibdó, Tuluá…"
          onFocus={() => setAbierto(true)}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setResaltado((r) => Math.min(r + 1, opciones.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setResaltado((r) => Math.max(r - 1, 0));
            } else if (e.key === "Enter") {
              // Sin esto, Enter envía el formulario a medio llenar.
              e.preventDefault();
              if (opciones[resaltado]) elegir(opciones[resaltado]);
            } else if (e.key === "Escape") {
              setAbierto(false);
            }
          }}
        />
      )}

      {abierto && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {cargando && opciones.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">Buscando…</li>
          )}
          {!cargando && opciones.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              Ningún municipio coincide.
            </li>
          )}
          {opciones.map((c, i) => (
            <li key={c.slug}>
              <button
                type="button"
                onMouseEnter={() => setResaltado(i)}
                onClick={() => elegir(c)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === resaltado ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
              >
                <strong className="text-slate-900">{c.nombre}</strong>
                <span className="text-slate-500"> — {c.departamento}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
