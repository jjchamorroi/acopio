"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIAS } from "@/lib/categorias";
import type { Ciudad } from "@/lib/tipos";

export default function Filtros({ ciudades }: { ciudades: Ciudad[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function actualizar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(params.toString());
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    router.push(`/?${nuevos.toString()}`);
  }

  const estilo =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm " +
    "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Ciudad
        </span>
        <select
          className={estilo}
          value={params.get("ciudad") ?? ""}
          onChange={(e) => actualizar("ciudad", e.target.value)}
        >
          <option value="">Todas las ciudades</option>
          {ciudades.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nombre} — {c.departamento}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Quiero donar…
        </span>
        <select
          className={estilo}
          value={params.get("categoria") ?? ""}
          onChange={(e) => actualizar("categoria", e.target.value)}
        >
          <option value="">Cualquier cosa</option>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
