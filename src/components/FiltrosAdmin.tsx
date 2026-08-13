"use client";

import { useMemo } from "react";
import type { CentroPublico } from "@/lib/tipos";
import { TIPOS_LUGAR } from "@/lib/tipos-lugar";

/**
 * Buscador y cola de trabajo del admin.
 *
 * Con 282 lugares la lista dejó de servir para lo que se usa el admin, que no
 * es mirar el catálogo sino ACTUALIZAR lo que se quedó viejo. Por eso los
 * filtros no son solo de navegación: los de arriba responden "¿dónde está tal
 * cosa?" y los de abajo responden "¿qué me falta por revisar?".
 *
 * El orden por defecto es por dato más viejo primero, que es como se trabaja
 * una lista así. Eso solo funciona desde que existe `dato_de`: con
 * `actualizado_en` los 275 lugares del lote parecían recién confirmados
 * porque el importador les movía la fecha en cada corrida.
 */

export type EstadoFiltros = {
  texto: string;
  ciudad: string;
  tipo: string;
  /** Cola de trabajo: null = ninguna, si no la clave del criterio. */
  atencion: string | null;
};

export const FILTROS_VACIOS: EstadoFiltros = {
  texto: "",
  ciudad: "",
  tipo: "",
  atencion: null,
};

const HORAS_VIEJO = 48;

/** Los criterios de "esto necesita que alguien lo mire". */
export const ATENCION: {
  id: string;
  label: string;
  cumple: (c: CentroPublico) => boolean;
}[] = [
  {
    id: "viejo",
    label: "dato viejo",
    cumple: (c) =>
      (Date.now() - new Date(c.dato_de).getTime()) / 3_600_000 >= HORAS_VIEJO,
  },
  {
    id: "pendiente",
    label: "sin verificar",
    cumple: (c) => c.estado === "pendiente",
  },
  {
    // Sin teléfono no hay forma de confirmar nada: son los que más trabajo
    // cuestan y por eso conviene poder aislarlos.
    id: "sin-telefono",
    label: "sin teléfono",
    cumple: (c) => !c.telefono,
  },
  {
    id: "aproximado",
    label: "ubicación aproximada",
    cumple: (c) => c.ubicacion_aproximada,
  },
  {
    id: "urgente",
    label: "con algo urgente",
    cumple: (c) => c.necesidades.some((n) => n.nivel === "urgente"),
  },
];

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Aplica los filtros y ordena por dato más viejo primero. */
export function filtrar(
  centros: CentroPublico[],
  f: EstadoFiltros
): CentroPublico[] {
  const q = normalizar(f.texto.trim());
  const criterio = ATENCION.find((a) => a.id === f.atencion);

  return centros
    .filter((c) => {
      if (f.ciudad && c.ciudad_slug !== f.ciudad) return false;
      if (f.tipo && c.tipo !== f.tipo) return false;
      if (criterio && !criterio.cumple(c)) return false;
      if (!q) return true;
      // Una sola caja para nombre, dirección y ciudad: quien busca no sabe de
      // antemano en cuál de los tres campos está lo que recuerda.
      return normalizar(
        `${c.nombre} ${c.direccion} ${c.ciudad_nombre} ${c.responsable ?? ""}`
      ).includes(q);
    })
    .sort(
      (a, b) => new Date(a.dato_de).getTime() - new Date(b.dato_de).getTime()
    );
}

export default function FiltrosAdmin({
  centros,
  valor,
  onCambio,
  mostrados,
}: {
  centros: CentroPublico[];
  valor: EstadoFiltros;
  onCambio: (f: EstadoFiltros) => void;
  mostrados: number;
}) {
  const ciudades = useMemo(() => {
    const m = new Map<string, { slug: string; nombre: string; n: number }>();
    for (const c of centros) {
      const p = m.get(c.ciudad_slug);
      if (p) p.n++;
      else m.set(c.ciudad_slug, { slug: c.ciudad_slug, nombre: c.ciudad_nombre, n: 1 });
    }
    return [...m.values()].sort((a, b) => b.n - a.n || a.nombre.localeCompare(b.nombre));
  }, [centros]);

  const tipos = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of centros) m.set(c.tipo, (m.get(c.tipo) ?? 0) + 1);
    return TIPOS_LUGAR.filter((t) => m.has(t.id)).map((t) => ({
      ...t,
      n: m.get(t.id) ?? 0,
    }));
  }, [centros]);

  // El conteo va sobre TODOS los lugares, no sobre lo ya filtrado: la pregunta
  // que responde es "cuánto me falta en total", no "cuánto queda de esta vista".
  const cuentas = useMemo(
    () =>
      Object.fromEntries(
        ATENCION.map((a) => [a.id, centros.filter(a.cumple).length])
      ) as Record<string, number>,
    [centros]
  );

  const hayFiltro =
    valor.texto || valor.ciudad || valor.tipo || valor.atencion;

  const chip = (activo: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
      activo
        ? "bg-slate-900 text-white ring-slate-900"
        : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
    }`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <input
        type="search"
        value={valor.texto}
        onChange={(e) => onCambio({ ...valor, texto: e.target.value })}
        placeholder="Buscar por nombre, dirección, ciudad o responsable"
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={valor.ciudad}
          onChange={(e) => onCambio({ ...valor, ciudad: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las ciudades ({centros.length})</option>
          {ciudades.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nombre} ({c.n})
            </option>
          ))}
        </select>

        <select
          value={valor.tipo}
          onChange={(e) => onCambio({ ...valor, tipo: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.emoji} {t.label} ({t.n})
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
        Necesitan atención
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {ATENCION.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() =>
              onCambio({
                ...valor,
                atencion: valor.atencion === a.id ? null : a.id,
              })
            }
            className={chip(valor.atencion === a.id)}
          >
            {cuentas[a.id]} {a.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-600">
          Mostrando <strong className="text-slate-900">{mostrados}</strong> de{" "}
          {centros.length} · más viejo primero
        </p>
        {hayFiltro && (
          <button
            type="button"
            onClick={() => onCambio(FILTROS_VACIOS)}
            className="text-xs font-semibold text-slate-700 underline"
          >
            Quitar filtros
          </button>
        )}
      </div>
    </div>
  );
}
