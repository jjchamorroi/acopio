"use client";

import { useMemo, useState } from "react";
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
  const departamento = params.get("departamento") ?? "";

  // Los departamentos salen de las ciudades que YA tienen lugares, con su
  // cuenta: así el selector nunca ofrece un departamento vacío y de paso dice
  // dónde hay más.
  const departamentos = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of ciudades) m.set(c.departamento, (m.get(c.departamento) ?? 0) + 1);
    return [...m.entries()]
      .map(([nombre, lugares]) => ({ nombre, lugares }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [ciudades]);

  const ciudadesVisibles = useMemo(
    () =>
      departamento
        ? ciudades.filter((c) => c.departamento === departamento)
        : ciudades,
    [ciudades, departamento]
  );
  const categoria = params.get("categoria") ?? "";
  const tipo = params.get("tipo") ?? "";
  const abiertoAhora = params.get("abierto") === "1";
  const mascotas = params.get("mascotas") === "1";
  const hayFiltros =
    ubicado || !!ciudad || !!departamento || !!categoria || !!tipo || abiertoAhora || mascotas;

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
              className={`flex min-h-[42px] items-center justify-center rounded-lg px-1.5 py-2 text-center text-[12.5px] font-bold leading-tight transition sm:text-sm ${
                activo
                  ? "bg-white text-[var(--color-tinta)] shadow-sm"
                  : "text-[var(--color-apagado)] hover:text-[var(--color-tinta)]"
              }`}
            >
              {MODOS[id].corto}
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

        {/* Departamento antes que municipio: con 67 municipios en 24
            departamentos, buscar "Quibdó" en una lista alfabética plana es
            peor que elegir Chocó y ver los siete que hay. */}
        <ChipSelect
          valor={departamento}
          activo={!!departamento}
          onChange={(v) =>
            // Al cambiar de departamento se suelta el municipio: dejarlo
            // puesto daría una combinación imposible (Chocó + Manizales) y
            // una lista vacía sin explicación.
            navegar({
              departamento: v || null,
              ciudad: null,
              lat: null,
              lng: null,
            })
          }
        >
          <option value="">Departamento</option>
          {departamentos.map((d) => (
            <option key={d.nombre} value={d.nombre}>
              {d.nombre} ({d.lugares})
            </option>
          ))}
        </ChipSelect>

        <ChipSelect
          valor={ciudad}
          activo={!!ciudad}
          onChange={(v) => navegar({ ciudad: v || null, lat: null, lng: null })}
        >
          <option value="">
            {departamento ? `Municipio de ${departamento}` : "Municipio"}
          </option>
          {ciudadesVisibles.map((c) => (
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
                departamento: null,
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
