"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIAS, NIVELES, type NivelId } from "@/lib/categorias";
import type { CentroPublico } from "@/lib/tipos";

const input =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm " +
  "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export default function PanelAcopio({
  id,
  token,
}: {
  id: string;
  token: string;
}) {
  const [centro, setCentro] = useState<CentroPublico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState<string | null>(null);

  const [telefono, setTelefono] = useState("");
  const [horario, setHorario] = useState("");
  const [notas, setNotas] = useState("");
  const [niveles, setNiveles] = useState<Record<string, NivelId | "">>({});
  const [detalles, setDetalles] = useState<Record<string, string>>({});
  const [aceptaMascotas, setAceptaMascotas] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/acopios/${id}`);
        if (!res.ok) throw new Error("No se encontró el acopio");
        const { centro } = (await res.json()) as { centro: CentroPublico };
        if (!vivo) return;
        setCentro(centro);
        setTelefono(centro.telefono ?? "");
        setHorario(centro.horario ?? "");
        setNotas(centro.notas ?? "");
        setAceptaMascotas(centro.acepta_mascotas);
        setNiveles(
          Object.fromEntries(
            centro.necesidades.map((n) => [n.categoria, n.nivel])
          )
        );
        setDetalles(
          Object.fromEntries(
            centro.necesidades
              .filter((n) => n.detalle)
              .map((n) => [n.categoria, n.detalle as string])
          )
        );
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

  async function guardar(cambios: Record<string, unknown>, mensaje: string) {
    setGuardando(true);
    setError(null);
    setGuardado(null);
    try {
      const res = await fetch(`/api/acopios/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-acopio-token": token,
        },
        body: JSON.stringify(cambios),
      });
      const datos = await res.json();
      if (!res.ok) {
        throw new Error(
          [datos.error, datos.detalle].filter(Boolean).join(". ") ||
            "No se pudo guardar"
        );
      }
      setCentro(datos.centro);
      setGuardado(mensaje);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setGuardando(false);
    }
  }

  function guardarTodo() {
    const lista = Object.entries(niveles)
      .filter(([, nivel]) => nivel !== "")
      .map(([categoria, nivel]) => ({
        categoria,
        nivel: nivel as NivelId,
        detalle: detalles[categoria]?.trim() || null,
      }));
    guardar(
      {
        telefono,
        horario,
        notas,
        necesidades: lista,
        ...(centro?.tipo === "albergue"
          ? { acepta_mascotas: aceptaMascotas }
          : {}),
      },
      "Actualizado. Ya se ve en el mapa."
    );
  }

  if (cargando) {
    return <p className="text-sm text-slate-500">Cargando…</p>;
  }

  if (!centro) {
    return (
      <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error ?? "No se encontró el acopio."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {centro.nombre}
        </h1>
        <p className="text-sm text-slate-600">
          {centro.direccion} · {centro.ciudad_nombre}
        </p>
        <Link
          href={`/acopio/${centro.id}`}
          className="text-sm text-blue-700 hover:underline"
        >
          Ver la ficha pública →
        </Link>
      </header>

      {centro.estado === "pendiente" && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tu acopio aparece como <strong>sin verificar</strong> hasta que el
          equipo lo confirme por teléfono. Mientras tanto ya es visible en el
          mapa.
        </p>
      )}

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Datos de contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Teléfono
            </span>
            <input
              className={input}
              inputMode="tel"
              maxLength={40}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Horario
            </span>
            <input
              className={input}
              maxLength={120}
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Notas
          </span>
          <textarea
            className={input}
            rows={3}
            maxLength={500}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </label>
      </section>

      {centro.tipo === "albergue" && (
        <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-900">
            🐾 ¿Reciben personas con mascotas?
          </h2>
          <p className="mt-0.5 text-xs text-emerald-800">
            Es de los datos más buscados y casi nadie lo publica. Si cambia
            durante el día, actualizalo: alguien puede estar decidiendo si
            evacúa o no con base en esto.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { v: true as const, t: "Sí, las recibimos" },
              { v: false as const, t: "No podemos" },
              { v: null, t: "Sin definir" },
            ].map((o) => {
              const activo = aceptaMascotas === o.v;
              return (
                <button
                  key={String(o.v)}
                  type="button"
                  onClick={() => setAceptaMascotas(o.v)}
                  className={`rounded-full px-3 py-1.5 text-xs ring-1 ring-inset transition ${
                    activo
                      ? "bg-emerald-700 text-white ring-emerald-700"
                      : "bg-white text-emerald-900 ring-emerald-300 hover:bg-emerald-100"
                  }`}
                >
                  {o.t}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            ¿Qué necesitan ahora?
          </h2>
          <p className="text-xs text-slate-500">
            Actualizá esto varias veces al día si podés. Es lo que ve la gente
            antes de salir de la casa con el carro cargado.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {CATEGORIAS.map((cat) => {
            const nivelActual = niveles[cat.id] ?? "";
            return (
              <div key={cat.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-56 shrink-0 text-sm text-slate-800">
                    <span aria-hidden>{cat.emoji}</span> {cat.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(["", "urgente", "necesita", "sobra"] as const).map(
                      (nivel) => {
                        const activo = nivelActual === nivel;
                        return (
                          <button
                            key={nivel || "ninguno"}
                            type="button"
                            onClick={() =>
                              setNiveles((p) => ({ ...p, [cat.id]: nivel }))
                            }
                            className={`rounded-full px-3 py-1 text-xs ring-1 ring-inset transition ${
                              activo
                                ? "bg-slate-900 text-white ring-slate-900"
                                : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {nivel === "" ? "—" : NIVELES[nivel].label}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
                {nivelActual !== "" && (
                  <input
                    className={`${input} mt-2`}
                    maxLength={200}
                    placeholder="Detalle opcional: marca, tamaño, cantidad…"
                    value={detalles[cat.id] ?? ""}
                    onChange={(e) =>
                      setDetalles((p) => ({ ...p, [cat.id]: e.target.value }))
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {guardado && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {guardado}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={guardarTodo}
          disabled={guardando}
          className="rounded-md bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>

        {centro.estado !== "cerrado" ? (
          <button
            type="button"
            disabled={guardando}
            onClick={() => {
              if (
                confirm(
                  "¿Marcar el acopio como cerrado? Deja de aparecer en el mapa."
                )
              ) {
                guardar({ estado: "cerrado" }, "Acopio marcado como cerrado.");
              }
            }}
            className="rounded-md border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Ya no recibimos
          </button>
        ) : (
          <button
            type="button"
            disabled={guardando}
            onClick={() =>
              guardar({ estado: "pendiente" }, "Acopio reabierto.")
            }
            className="rounded-md border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Volver a abrir
          </button>
        )}
      </div>
    </div>
  );
}
