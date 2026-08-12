"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConvocatoriaPublica } from "@/lib/tipos";

type Inscripcion = {
  id: string;
  nombre: string;
  telefono: string;
  nota: string | null;
  estado: "confirmada" | "cancelada";
  creado_en: string;
};

/** Misma clave que guarda /admin en la sesión del navegador. */
const CLAVE_ADMIN = "acopio_admin_token";

const campo =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm " +
  "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

/** ISO → "2026-08-12T06:00" en hora local, que es lo que espera el input. */
function paraInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Vista de quien organiza —o del equipo, con la clave de administración—.
 *
 * Es el único lugar de toda la aplicación donde se muestran los datos de los
 * voluntarios; en público solo va el contador.
 */
export default function PanelConvocatoria({
  convocatoria,
  token,
  modoAdmin = false,
}: {
  convocatoria: ConvocatoriaPublica;
  token: string | null;
  modoAdmin?: boolean;
}) {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [datos, setDatos] = useState({
    titulo: convocatoria.titulo,
    descripcion: convocatoria.descripcion,
    lugar_encuentro: convocatoria.lugar_encuentro,
    inicia: paraInput(convocatoria.inicia),
    termina: paraInput(convocatoria.termina),
    cupo: convocatoria.cupo === null ? "" : String(convocatoria.cupo),
    que_llevar: convocatoria.que_llevar ?? "",
    requisitos: convocatoria.requisitos ?? "",
    con_riesgo: convocatoria.con_riesgo,
    telefono: convocatoria.telefono ?? "",
  });

  /**
   * En modo administrador va la clave del equipo; si no, el enlace privado de
   * quien convocó. El servidor resuelve los permisos igual en los dos casos.
   */
  function cabeceras(): Record<string, string> {
    const base: Record<string, string> = { "content-type": "application/json" };
    if (modoAdmin) {
      const clave =
        typeof window !== "undefined"
          ? (sessionStorage.getItem(CLAVE_ADMIN) ?? "")
          : "";
      return { ...base, authorization: `Bearer ${clave}` };
    }
    return { ...base, "x-acopio-token": token ?? "" };
  }

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/convocatorias/${convocatoria.id}/inscripciones`,
        { headers: cabeceras() }
      );
      if (res.status === 403) {
        setError("El enlace no es válido para esta convocatoria.");
        return;
      }
      const { inscripciones } = await res.json();
      setInscripciones(inscripciones ?? []);
    } catch {
      setError("No se pudo cargar la lista.");
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convocatoria.id, token, modoAdmin]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setGuardado(null);
    try {
      const res = await fetch(`/api/convocatorias/${convocatoria.id}`, {
        method: "PATCH",
        headers: cabeceras(),
        body: JSON.stringify({
          ...datos,
          // Vacío significa "sin tope", que en la base es NULL — no cero.
          cupo: datos.cupo.trim() === "" ? null : Number(datos.cupo),
          telefono: datos.telefono || null,
          que_llevar: datos.que_llevar || null,
          requisitos: datos.requisitos || null,
          inicia: new Date(datos.inicia).toISOString(),
          termina: new Date(datos.termina).toISOString(),
        }),
      });
      const r = await res.json();
      if (!res.ok) {
        throw new Error(
          r.detalles?.fieldErrors?.termina?.[0] ??
            r.error ??
            "No se pudo guardar"
        );
      }
      setGuardado("Cambios guardados.");
      setEditando(false);
      // Recargar para que el resto de la página muestre lo nuevo.
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(estado: "abierta" | "cancelada") {
    if (
      estado === "cancelada" &&
      !confirm(
        "¿Cancelar la convocatoria? Deja de aparecer y nadie más se puede apuntar."
      )
    ) {
      return;
    }
    await fetch(`/api/convocatorias/${convocatoria.id}`, {
      method: "PATCH",
      headers: cabeceras(),
      body: JSON.stringify({ estado }),
    });
    location.reload();
  }

  const confirmadas = inscripciones.filter((i) => i.estado === "confirmada");

  return (
    <section className="rounded-lg border border-blue-300 bg-blue-50 p-4">
      <h2 className="text-sm font-semibold text-blue-900">
        {modoAdmin ? "Panel del equipo" : "Panel de quien organiza"}
      </h2>
      <p className="mt-0.5 text-xs text-blue-800">
        {modoAdmin
          ? "Estás viendo esto con la clave de administración. Los datos de los voluntarios no son públicos."
          : "Estos datos solo los ves vos, con este enlace. No se publican."}
      </p>

      {error && (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {guardado && (
        <p className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {guardado}
        </p>
      )}

      {cargando ? (
        <p className="mt-3 text-sm text-blue-800">Cargando…</p>
      ) : confirmadas.length === 0 ? (
        <p className="mt-3 text-sm text-blue-800">
          Todavía no se ha apuntado nadie. Compartí el enlace de la convocatoria.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-blue-200 rounded-md border border-blue-200 bg-white">
          {confirmadas.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{i.nombre}</p>
                {i.nota && <p className="text-xs text-slate-600">{i.nota}</p>}
              </div>
              <a
                href={`tel:${i.telefono.replace(/\s/g, "")}`}
                className="shrink-0 text-sm font-medium text-blue-700 hover:underline"
              >
                {i.telefono}
              </a>
            </li>
          ))}
        </ul>
      )}

      {editando ? (
        <form
          onSubmit={guardar}
          className="mt-4 space-y-3 rounded-md border border-blue-200 bg-white p-3"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Qué hay que hacer
            </span>
            <input
              className={campo}
              required
              minLength={5}
              maxLength={120}
              value={datos.titulo}
              onChange={(e) => setDatos({ ...datos, titulo: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Descripción
            </span>
            <textarea
              className={campo}
              required
              minLength={10}
              maxLength={600}
              rows={3}
              value={datos.descripcion}
              onChange={(e) =>
                setDatos({ ...datos, descripcion: e.target.value })
              }
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Empieza
              </span>
              <input
                type="datetime-local"
                className={campo}
                required
                value={datos.inicia}
                onChange={(e) => setDatos({ ...datos, inicia: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Termina
              </span>
              <input
                type="datetime-local"
                className={campo}
                required
                value={datos.termina}
                onChange={(e) => setDatos({ ...datos, termina: e.target.value })}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Punto de encuentro
            </span>
            <input
              className={campo}
              required
              minLength={5}
              maxLength={200}
              value={datos.lugar_encuentro}
              onChange={(e) =>
                setDatos({ ...datos, lugar_encuentro: e.target.value })
              }
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Cupo — vacío es sin tope
              </span>
              <input
                type="number"
                min={1}
                max={5000}
                className={campo}
                value={datos.cupo}
                onChange={(e) => setDatos({ ...datos, cupo: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Teléfono de contacto
              </span>
              <input
                className={campo}
                inputMode="tel"
                maxLength={40}
                value={datos.telefono}
                onChange={(e) =>
                  setDatos({ ...datos, telefono: e.target.value })
                }
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Qué llevar
            </span>
            <input
              className={campo}
              maxLength={300}
              value={datos.que_llevar}
              onChange={(e) =>
                setDatos({ ...datos, que_llevar: e.target.value })
              }
              placeholder="Guantes, botas, agua propia, almuerzo"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Requisitos
            </span>
            <input
              className={campo}
              maxLength={300}
              value={datos.requisitos}
              onChange={(e) =>
                setDatos({ ...datos, requisitos: e.target.value })
              }
            />
          </label>

          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-amber-700"
              checked={datos.con_riesgo}
              onChange={(e) =>
                setDatos({ ...datos, con_riesgo: e.target.checked })
              }
            />
            <span className="text-xs text-amber-900">
              Trabajo con riesgo. Muestra una advertencia y debe coordinarse con
              un organismo de socorro.
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {convocatoria.estado === "abierta" && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Editar la convocatoria
            </button>
          )}
          {convocatoria.estado === "abierta" ? (
            <button
              type="button"
              onClick={() => cambiarEstado("cancelada")}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Cancelar la convocatoria
            </button>
          ) : (
            <button
              type="button"
              onClick={() => cambiarEstado("abierta")}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reabrir la convocatoria
            </button>
          )}
        </div>
      )}
    </section>
  );
}
