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

/**
 * Vista de quien organiza —o del equipo, con la clave de administración—.
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
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function cancelarConvocatoria() {
    if (
      !confirm(
        "¿Cancelar la convocatoria? Deja de aparecer y nadie más se puede apuntar."
      )
    )
      return;
    await fetch(`/api/convocatorias/${convocatoria.id}`, {
      method: "PATCH",
      headers: cabeceras(),
      body: JSON.stringify({ estado: "cancelada" }),
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

      {cargando ? (
        <p className="mt-3 text-sm text-blue-800">Cargando…</p>
      ) : confirmadas.length === 0 ? (
        <p className="mt-3 text-sm text-blue-800">
          Todavía no se ha apuntado nadie. Compartí el enlace de la convocatoria.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-blue-200 rounded-md border border-blue-200 bg-white">
          {confirmadas.map((i) => (
            <li key={i.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
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

      {convocatoria.estado === "abierta" && (
        <button
          type="button"
          onClick={cancelarConvocatoria}
          className="mt-3 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Cancelar la convocatoria
        </button>
      )}
    </section>
  );
}
