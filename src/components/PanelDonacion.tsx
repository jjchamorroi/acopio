"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { categoria as buscarCategoria } from "@/lib/categorias";
import type { DonacionPublica } from "@/lib/tipos";

const ESTADOS = {
  disponible: { label: "Disponible", clase: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  comprometida: { label: "Ya la van a recoger", clase: "bg-amber-50 text-amber-800 ring-amber-200" },
  entregada: { label: "Entregada", clase: "bg-slate-100 text-slate-700 ring-slate-200" },
  cancelada: { label: "Cancelada", clase: "bg-slate-100 text-slate-700 ring-slate-200" },
} as const;

export default function PanelDonacion({
  id,
  token,
}: {
  id: string;
  token: string | null;
}) {
  const [donacion, setDonacion] = useState<DonacionPublica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/donaciones/${id}`);
        if (!res.ok) throw new Error("No se encontró la donación");
        const { donacion } = (await res.json()) as {
          donacion: DonacionPublica;
        };
        if (vivo) setDonacion(donacion);
      } catch (err) {
        if (vivo) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  async function cambiarEstado(estado: string) {
    if (!token) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/donaciones/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-acopio-token": token,
        },
        body: JSON.stringify({ estado }),
      });
      const datos = await res.json();
      if (!res.ok) {
        throw new Error(
          [datos.error, datos.detalle].filter(Boolean).join(". ") ||
            "No se pudo actualizar"
        );
      }
      setDonacion(datos.donacion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="text-sm text-slate-500">Cargando…</p>;

  if (!donacion) {
    return (
      <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error ?? "No se encontró la donación."}
      </p>
    );
  }

  const cat = buscarCategoria(donacion.categoria);
  const estado = ESTADOS[donacion.estado];

  return (
    <div className="space-y-5">
      <header>
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-inset ring-teal-200">
          <span aria-hidden>{cat?.emoji}</span>{" "}
          {cat?.label ?? donacion.categoria}
        </span>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          {donacion.descripcion}
        </h1>
        <p className="text-sm text-slate-600">
          {donacion.cantidad ? `${donacion.cantidad} · ` : ""}Zona aproximada en{" "}
          {donacion.ciudad_nombre}
        </p>
        <span
          className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${estado.clase}`}
        >
          {estado.label}
        </span>
      </header>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {token ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Actualizar el estado
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            En cuanto la entregues, marcala. Una donación que ya no existe hace
            perder el viaje a alguien.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["disponible", "Sigue disponible"],
                ["comprometida", "Ya la van a recoger"],
                ["entregada", "Ya la entregué"],
                ["cancelada", "Cancelar"],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                disabled={guardando || donacion.estado === valor}
                onClick={() => cambiarEstado(valor)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${
                  donacion.estado === valor
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Para cambiar el estado hay que entrar con el enlace privado que se
          entregó al publicarla (el que termina en <code>?t=…</code>).
        </p>
      )}

      <div className="flex gap-4 text-sm">
        <Link href="/donaciones" className="font-medium text-blue-700 underline">
          Ver todas las donaciones
        </Link>
        <Link href="/" className="font-medium text-blue-700 underline">
          Ir al mapa
        </Link>
      </div>
    </div>
  );
}
