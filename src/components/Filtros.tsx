"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIAS } from "@/lib/categorias";
import { TIPOS_LUGAR, MODOS, type ModoId } from "@/lib/tipos-lugar";
import type { Ciudad } from "@/lib/tipos";

/**
 * Del rediseño, nota 03: «Tres desplegables al final de la página son
 * invisibles en móvil. Chips fijos arriba del listado muestran el estado del
 * filtro sin abrir nada».
 *
 * Los que despliegan opciones son un <select> disfrazado de chip, no un menú
 * propio: así el teléfono abre su propio selector nativo —más cómodo y
 * accesible— y no hay que reimplementar teclado ni lector de pantalla.
 */

const CHIP =
  "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition";
const CHIP_APAGADO = `${CHIP} border-[var(--color-borde-fuerte)] bg-white text-[var(--color-tinta)] hover:bg-[var(--color-hueso)]`;
const CHIP_ACTIVO = `${CHIP} border-[var(--color-tinta)] bg-[var(--color-tinta)] text-white`;

function ChipSelect({
  valor,
  activo,
  onChange,
  children,
}: {
  valor: string;
  activo: boolean;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`${activo ? CHIP_ACTIVO : CHIP_APAGADO} appearance-none pr-8`}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className={`pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 ${
          activo ? "fill-white" : "fill-[var(--color-tenue)]"
        }`}
      >
        <path d="M5.5 7.5 10 12l4.5-4.5z" />
      </svg>
    </div>
  );
}

export default function Filtros({
  ciudades,
  modo,
  ubicado,
}: {
  ciudades: Ciudad[];
  modo: ModoId;
  ubicado: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [ubicando, setUbicando] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);

  function navegar(cambios: Record<string, string | null>) {
    const nuevos = new URLSearchParams(params.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) nuevos.set(clave, valor);
      else nuevos.delete(clave);
    }
    const q = nuevos.toString();
    router.push(q ? `/?${q}` : "/");
  }

  function cambiarModo(nuevo: ModoId) {
    // Al cambiar de público se limpian los filtros del anterior: pedir
    // "albergues que necesiten pañales" no sirve a quien busca dónde dormir.
    navegar({ modo: nuevo, tipo: null, categoria: null, mascotas: null });
  }

  function ubicarme() {
    if (ubicado) {
      navegar({ lat: null, lng: null });
      return;
    }
    if (!navigator.geolocation) {
      setErrorUbicacion("Tu navegador no permite compartir la ubicación.");
      return;
    }
    setUbicando(true);
    setErrorUbicacion(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicando(false);
        navegar({
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5),
          // Ordenar por distancia real vuelve irrelevante el municipio: lo
          // más cercano puede estar en el de al lado.
          ciudad: null,
        });
      },
      (err) => {
        setUbicando(false);
        setErrorUbicacion(
          err.code === err.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Elige tu municipio en el filtro."
            : "No pudimos obtener tu ubicación. Elige tu municipio."
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }

  const esDonar = modo === "donar";
  const esVoluntarios = modo === "voluntarios";
  const tiposVisibles = TIPOS_LUGAR.filter((t) => (esDonar ? t.recibe : t.entrega));

  const ciudad = params.get("ciudad") ?? "";
  const categoria = params.get("categoria") ?? "";
  const tipo = params.get("tipo") ?? "";
  const abiertoAhora = params.get("abierto") === "1";
  const mascotas = params.get("mascotas") === "1";
  const hayFiltros =
    ubicado || !!ciudad || !!categoria || !!tipo || abiertoAhora || mascotas;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="¿Qué necesitas hacer?"
        className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--color-borde-suave)] p-1"
      >
        {(Object.keys(MODOS) as ModoId[]).map((id) => {
          const activo = modo === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => cambiarModo(id)}
              aria-pressed={activo}
              className={`rounded-lg px-2 py-2.5 text-center text-[13px] font-bold transition sm:text-sm ${
                activo
                  ? "bg-white text-[var(--color-tinta)] shadow-sm"
                  : "text-[var(--color-apagado)] hover:text-[var(--color-tinta)]"
              }`}
            >
              {MODOS[id].label}
            </button>
          );
        })}
      </div>

      <div className="chips-scroll -mx-4 flex items-center gap-2 overflow-x-auto px-4">
        <button
          type="button"
          onClick={ubicarme}
          disabled={ubicando}
          className={ubicado ? CHIP_ACTIVO : CHIP_APAGADO}
        >
          {ubicando ? "Buscando…" : ubicado ? "Cerca de mí ✕" : "Cerca de mí"}
        </button>

        {!esVoluntarios && (
          <button
            type="button"
            onClick={() => navegar({ abierto: abiertoAhora ? null : "1" })}
            className={abiertoAhora ? CHIP_ACTIVO : CHIP_APAGADO}
          >
            Abierto ahora
          </button>
        )}

        <ChipSelect
          valor={ciudad}
          activo={!!ciudad}
          onChange={(v) => navegar({ ciudad: v || null, lat: null, lng: null })}
        >
          <option value="">Municipio</option>
          {ciudades.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nombre}
            </option>
          ))}
        </ChipSelect>

        {esDonar && (
          <ChipSelect
            valor={categoria}
            activo={!!categoria}
            onChange={(v) => navegar({ categoria: v || null })}
          >
            <option value="">Qué dono</option>
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </ChipSelect>
        )}

        {!esVoluntarios && (
          <ChipSelect
            valor={tipo}
            activo={!!tipo}
            onChange={(v) => navegar({ tipo: v || null })}
          >
            <option value="">Tipo de lugar</option>
            {tiposVisibles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.label}
              </option>
            ))}
          </ChipSelect>
        )}

        {modo === "ayuda" && (
          <button
            type="button"
            onClick={() => navegar({ mascotas: mascotas ? null : "1" })}
            className={mascotas ? CHIP_ACTIVO : CHIP_APAGADO}
          >
            🐾 Acepta mascotas
          </button>
        )}

        {hayFiltros && (
          <button
            type="button"
            onClick={() =>
              navegar({
                ciudad: null,
                categoria: null,
                tipo: null,
                abierto: null,
                mascotas: null,
                lat: null,
                lng: null,
              })
            }
            className="shrink-0 whitespace-nowrap px-2 text-[13px] font-semibold text-[var(--color-tenue)] hover:text-[var(--color-tinta)]"
          >
            Limpiar
          </button>
        )}
      </div>

      {errorUbicacion && (
        <p className="rounded-lg border border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)] px-3 py-2 text-[13px] text-[var(--color-urgente-texto)]">
          {errorUbicacion}
        </p>
      )}
    </div>
  );
}
