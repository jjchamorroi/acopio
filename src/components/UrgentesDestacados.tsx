import Link from "next/link";
import { categoria as buscarCategoria } from "@/lib/categorias";
import type { CentroPublico } from "@/lib/tipos";

/**
 * Del rediseño, nota 02: «"4 con algo urgente" hoy es solo un número en una
 * barra. Conviértelo en una fila de tarjetas con nombre y qué falta: es la
 * información que hace que alguien salga de la casa».
 *
 * Va ANTES del mapa a propósito. Un mapa exige buscar; esto se lee.
 */
export default function UrgentesDestacados({
  centros,
  distancias,
}: {
  centros: CentroPublico[];
  /** Metros por id, cuando la lista viene ordenada por cercanía. */
  distancias?: Map<string, number>;
}) {
  const urgentes = centros.filter((c) =>
    c.necesidades.some((n) => n.nivel === "urgente")
  );
  if (urgentes.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-extrabold tracking-tight">
          Falta con urgencia
        </h2>
        <span className="text-[13px] font-semibold text-[var(--color-tenue)]">
          {urgentes.length} {urgentes.length === 1 ? "lugar" : "lugares"}
        </span>
      </div>

      {/* Carrusel horizontal: en móvil se arrastra de lado en vez de empujar
          el mapa fuera de la pantalla. */}
      <div className="chips-scroll -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
        {urgentes.slice(0, 8).map((c) => {
          const pide = c.necesidades
            .filter((n) => n.nivel === "urgente")
            .map((n) => buscarCategoria(n.categoria)?.label ?? n.categoria);
          const m = distancias?.get(c.id);
          const dist =
            m === undefined
              ? null
              : m < 1000
                ? `${Math.round(m / 10) * 10} m`
                : `${(m / 1000).toFixed(1).replace(".", ",")} km`;

          return (
            <Link
              key={c.id}
              href={`/acopio/${c.id}`}
              className="flex min-w-[230px] max-w-[260px] shrink-0 flex-col gap-1.5 rounded-xl border border-[var(--color-borde)] border-t-[3px] border-t-[var(--color-urgente)] bg-white p-3.5 transition hover:shadow-md"
            >
              <span className="text-xs font-extrabold tracking-wide text-[var(--color-urgente)]">
                URGENTE{dist ? ` · ${dist}` : ""}
              </span>
              <span className="text-[15px] font-bold leading-tight">
                {c.nombre}
              </span>
              <span className="text-[13px] text-[var(--color-apagado)]">
                {pide.slice(0, 3).join(", ")}
                {pide.length > 3 ? ` y ${pide.length - 3} más` : ""}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
