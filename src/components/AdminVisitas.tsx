"use client";

import { useEffect, useState } from "react";
import type { ResumenVisitas } from "@/lib/consultas";

/**
 * Cuánta gente entra.
 *
 * Sin cookies, sin terceros y sin nada que identifique a una persona: todo
 * sale de contadores por día. Por eso hay cosas que NO puede responder —de
 * qué ciudad entran, qué hicieron antes de irse— y es el precio de no
 * perfilar a gente que está en una emergencia.
 */
export default function AdminVisitas({ token }: { token: string }) {
  const [datos, setDatos] = useState<ResumenVisitas | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto || datos) return;
    void (async () => {
      try {
        const res = await fetch("/api/visitas", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok) setDatos(await res.json());
      } catch {
        // El panel sirve igual sin las cifras.
      }
    })();
  }, [abierto, datos, token]);

  const n = (x: number) => x.toLocaleString("es-CO");
  const maxDia = datos ? Math.max(1, ...datos.porDia.map((d) => d.visitas)) : 1;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Visitas</h2>
        <button
          type="button"
          onClick={() => setAbierto(!abierto)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
        >
          {abierto ? "Ocultar" : "Ver visitas"}
        </button>
      </div>

      {abierto && !datos && (
        <p className="text-sm text-slate-500">Cargando…</p>
      )}

      {abierto && datos && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["Hoy", datos.hoy],
              ["Ayer", datos.ayer],
              ["Últimos 7 días", datos.semana],
            ] as const).map(([etiqueta, v]) => (
              <div key={etiqueta} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {etiqueta}
                </p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {n(v.visitas)}
                </p>
                <p className="text-xs text-slate-600">
                  {n(v.personas)} {v.personas === 1 ? "persona" : "personas"}
                </p>
              </div>
            ))}
          </div>

          {datos.porDia.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Últimos días
              </p>
              <div className="space-y-1">
                {datos.porDia.map((d) => (
                  <div key={d.fecha} className="flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 text-slate-600">
                      {d.fecha.slice(5)}
                    </span>
                    <span
                      className="h-3 rounded-sm bg-slate-800"
                      style={{ width: `${Math.max(2, (d.visitas / maxDia) * 100)}%` }}
                    />
                    <span className="shrink-0 font-semibold text-slate-900">
                      {n(d.visitas)}
                    </span>
                    <span className="shrink-0 text-slate-500">
                      · {n(d.personas)} pers.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Páginas más vistas (7 días)
              </p>
              {datos.paginas.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos todavía.</p>
              ) : (
                <ul className="space-y-0.5 text-sm">
                  {datos.paginas.map((p) => (
                    <li key={p.ruta} className="flex justify-between gap-3">
                      <span className="truncate text-slate-700">{p.ruta}</span>
                      <span className="shrink-0 font-semibold">{n(p.visitas)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                De dónde llegan (7 días)
              </p>
              {datos.origenes.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos todavía.</p>
              ) : (
                <ul className="space-y-0.5 text-sm">
                  {datos.origenes.map((o) => (
                    <li key={o.origen} className="flex justify-between gap-3">
                      <span className="truncate text-slate-700">
                        {o.origen === "directo"
                          ? "Directo / WhatsApp"
                          : o.origen}
                      </span>
                      <span className="shrink-0 font-semibold">{n(o.visitas)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
            Sin cookies ni terceros. No se guarda la IP ni nada que identifique
            a una persona: “personas” cuenta huellas irreversibles que cambian
            cada día, así que no se puede seguir a nadie de un día para otro.
            Los robots no se cuentan porque casi ninguno ejecuta JavaScript.
          </p>
        </div>
      )}
    </section>
  );
}
