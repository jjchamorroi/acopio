"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIAS } from "@/lib/categorias";
import { TIPOS_LUGAR, MODOS, type ModoId } from "@/lib/tipos-lugar";
import type { Ciudad } from "@/lib/tipos";

export default function Filtros({
  ciudades,
  modo,
}: {
  ciudades: Ciudad[];
  modo: ModoId;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function navegar(cambios: Record<string, string | null>) {
    const nuevos = new URLSearchParams(params.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) nuevos.set(clave, valor);
      else nuevos.delete(clave);
    }
    router.push(`/?${nuevos.toString()}`);
  }

  function cambiarModo(nuevo: ModoId) {
    // Al cambiar de público se limpian los filtros del anterior: pedir
    // "albergues que necesiten pañales" no le sirve a quien busca dónde dormir.
    navegar({ modo: nuevo, tipo: null, categoria: null, mascotas: null });
  }

  const estilo =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm " +
    "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  // Cada modo filtra por lo suyo: donar por categoría, ayuda por mascotas, y
  // las convocatorias solo por ciudad —el resto de filtros son de lugares y
  // acá no hay lugares, hay jornadas.
  const esDonar = modo === "donar";
  const esVoluntarios = modo === "voluntarios";
  const tiposVisibles = TIPOS_LUGAR.filter((t) =>
    esDonar ? t.recibe : t.entrega
  );

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="¿Qué necesitás hacer?"
        className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
      >
        {(Object.keys(MODOS) as ModoId[]).map((id) => {
          const activo = modo === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => cambiarModo(id)}
              aria-pressed={activo}
              className={`rounded-md px-2 py-2.5 text-center text-xs font-medium transition sm:text-sm ${
                activo
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-300"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {MODOS[id].label}
            </button>
          );
        })}
      </div>

      <div className={`grid gap-3 ${esVoluntarios ? "" : "sm:grid-cols-3"}`}>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Ciudad
          </span>
          <select
            className={estilo}
            value={params.get("ciudad") ?? ""}
            onChange={(e) => navegar({ ciudad: e.target.value || null })}
          >
            <option value="">Todas las ciudades</option>
            {ciudades.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre} — {c.departamento}
              </option>
            ))}
          </select>
        </label>

        {!esVoluntarios && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Tipo de lugar
          </span>
          <select
            className={estilo}
            value={params.get("tipo") ?? ""}
            onChange={(e) => navegar({ tipo: e.target.value || null })}
          >
            <option value="">Todos</option>
            {tiposVisibles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </label>
        )}

        {esVoluntarios ? null : esDonar ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Quiero donar…
            </span>
            <select
              className={estilo}
              value={params.get("categoria") ?? ""}
              onChange={(e) => navegar({ categoria: e.target.value || null })}
            >
              <option value="">Cualquier cosa</option>
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="flex items-end">
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                className="size-4 accent-slate-900"
                checked={params.get("mascotas") === "1"}
                onChange={(e) =>
                  navegar({ mascotas: e.target.checked ? "1" : null })
                }
              />
              <span>
                <span aria-hidden>🐾</span> Que acepten mascotas
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
