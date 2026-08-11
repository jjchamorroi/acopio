"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CentroPublico } from "@/lib/tipos";
import { categoria as buscarCategoria } from "@/lib/categorias";

/**
 * El token se guarda en sessionStorage, no en localStorage ni en una cookie:
 * muere al cerrar la pestaña, que es lo razonable para una clave compartida
 * entre varias personas de una redacción.
 */
const CLAVE = "acopio_admin_token";

export default function PanelAdmin() {
  const [token, setToken] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [centros, setCentros] = useState<CentroPublico[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (tk: string) => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/acopios?todos=1", {
        headers: { authorization: `Bearer ${tk}` },
      });
      if (!res.ok) throw new Error("No se pudo cargar el listado");
      const { centros } = (await res.json()) as { centros: CentroPublico[] };
      setCentros(centros);
      setAutenticado(true);
      sessionStorage.setItem(CLAVE, tk);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const guardado = sessionStorage.getItem(CLAVE);
    if (guardado) {
      setToken(guardado);
      cargar(guardado);
    }
  }, [cargar]);

  async function cambiarEstado(id: string, estado: string) {
    setError(null);
    const res = await fetch(`/api/acopios/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) {
      const datos = await res.json().catch(() => ({}));
      setError(datos.error ?? "No se pudo actualizar");
      return;
    }
    await cargar(token);
  }

  if (!autenticado) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          cargar(token);
        }}
        className="mx-auto max-w-sm space-y-3 rounded-lg border border-slate-200 bg-white p-6"
      >
        <h1 className="text-lg font-semibold text-slate-900">Panel interno</h1>
        <p className="text-sm text-slate-600">
          Clave de administración (variable <code>ADMIN_TOKEN</code>).
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          autoComplete="off"
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={cargando || !token}
          className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    );
  }

  const pendientes = centros.filter((c) => c.estado === "pendiente");
  const resto = centros.filter((c) => c.estado !== "pendiente");

  function Fila({ c }: { c: CentroPublico }) {
    const urgentes = c.necesidades.filter((n) => n.nivel === "urgente");
    return (
      <article className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">
              <Link href={`/acopio/${c.id}`} className="hover:underline">
                {c.nombre}
              </Link>
              {c.es_demo && (
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600">
                  prueba
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-600">{c.direccion}</p>
            <p className="text-xs text-slate-500">
              {c.ciudad_nombre} · {c.telefono ?? "sin teléfono"} ·{" "}
              {c.responsable ?? "sin responsable"}
            </p>
            {urgentes.length > 0 && (
              <p className="mt-1 text-xs text-red-700">
                Urgente:{" "}
                {urgentes
                  .map((n) => buscarCategoria(n.categoria)?.label ?? n.categoria)
                  .join(", ")}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
            {c.estado}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {c.telefono && (
            <a
              href={`tel:${c.telefono.replace(/\s/g, "")}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Llamar para confirmar
            </a>
          )}
          {c.estado !== "verificado" && (
            <button
              onClick={() => cambiarEstado(c.id, "verificado")}
              className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
            >
              Verificar
            </button>
          )}
          {c.estado !== "cerrado" && (
            <button
              onClick={() => cambiarEstado(c.id, "cerrado")}
              className="rounded-md border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-50"
            >
              Cerrar
            </button>
          )}
          {c.estado === "cerrado" && (
            <button
              onClick={() => cambiarEstado(c.id, "pendiente")}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Reabrir
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Panel interno</h1>
        <button
          onClick={() => {
            sessionStorage.removeItem(CLAVE);
            setAutenticado(false);
            setToken("");
          }}
          className="text-sm text-slate-600 hover:underline"
        >
          Salir
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-amber-800">
          Por verificar ({pendientes.length})
        </h2>
        {pendientes.length === 0 ? (
          <p className="text-sm text-slate-500">Nada pendiente.</p>
        ) : (
          <div className="space-y-3">
            {pendientes.map((c) => (
              <Fila key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Resto ({resto.length})
        </h2>
        <div className="space-y-3">
          {resto.map((c) => (
            <Fila key={c.id} c={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
