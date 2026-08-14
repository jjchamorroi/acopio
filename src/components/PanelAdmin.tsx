"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CentroPublico, ConvocatoriaPublica } from "@/lib/tipos";
import { categoria as buscarCategoria } from "@/lib/categorias";
import { frescura, haceCuanto } from "@/lib/frescura";
import AdminNoticias from "./AdminNoticias";
import FiltrosAdmin, {
  filtrar,
  FILTROS_VACIOS,
  type EstadoFiltros,
} from "./FiltrosAdmin";

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
  const [convocatorias, setConvocatorias] = useState<ConvocatoriaPublica[]>([]);
  const [filtros, setFiltros] = useState<EstadoFiltros>(FILTROS_VACIOS);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (tk: string) => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/acopios?todos=1", {
        headers: { authorization: `Bearer ${tk}` },
      });
      if (res.status === 401) {
        // Se borra la clave guardada: si no, al recargar la página el panel
        // volvería a intentar entrar con la misma que acaba de fallar.
        sessionStorage.removeItem(CLAVE);
        throw new Error(
          "Clave incorrecta. Es la variable ADMIN_TOKEN del servidor."
        );
      }
      if (!res.ok) throw new Error("No se pudo cargar el listado");
      const { centros } = (await res.json()) as { centros: CentroPublico[] };
      setCentros(centros);

      // Las convocatorias van en la misma carga: si falla, el panel de lugares
      // sigue sirviendo — es información de apoyo, no la principal.
      try {
        const rc = await fetch("/api/convocatorias?pasadas=1", {
          headers: { authorization: `Bearer ${tk}` },
        });
        if (rc.ok) {
          const { convocatorias } = (await rc.json()) as {
            convocatorias: ConvocatoriaPublica[];
          };
          setConvocatorias(convocatorias);
        }
      } catch {
        // sin convocatorias, el resto del panel funciona igual
      }

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

  /**
   * Borrado definitivo. Se pide escribir ELIMINAR y no un simple "aceptar":
   * cerrar y eliminar están a dos botones de distancia, y confundirlos borra
   * un lugar real con todo su historial.
   */
  async function eliminarLugar(id: string, nombre: string) {
    const escrito = prompt(
      `Vas a ELIMINAR "${nombre}" y todo su historial. No se puede deshacer.

` +
        `Si el lugar existió y solo dejó de recibir, usa "Cerrar" en vez de esto.

` +
        `Escribe ELIMINAR para confirmar:`
    );
    if (escrito !== "ELIMINAR") return;

    const res = await fetch(`/api/acopios/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo eliminar");
      return;
    }
    await cargar(token);
  }

  async function eliminarConvocatoria(id: string, titulo: string) {
    const escrito = prompt(
      `Vas a ELIMINAR la convocatoria "${titulo}". No se puede deshacer.

` +
        `Si simplemente ya no se hace, usa "Cancelar" — así conservas los ` +
        `teléfonos de quienes se apuntaron para avisarles.

` +
        `Escribe ELIMINAR para confirmar:`
    );
    if (escrito !== "ELIMINAR") return;

    let res = await fetch(`/api/convocatorias/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });

    // 409 = hay gente apuntada. Se pregunta una segunda vez, diciendo cuántos.
    if (res.status === 409) {
      const d = await res.json().catch(() => ({}));
      if (!confirm(`${d.error}. ${d.detalle}

¿Eliminar de todas formas?`)) {
        return;
      }
      res = await fetch(`/api/convocatorias/${id}?forzar=1`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
    }

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "No se pudo eliminar");
      return;
    }
    await cargar(token);
  }

  async function cambiarEstado(
    id: string,
    estado: string,
    motivo_rechazo?: string
  ) {
    setError(null);
    const res = await fetch(`/api/acopios/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(
        motivo_rechazo === undefined ? { estado } : { estado, motivo_rechazo }
      ),
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

  // La cola va aparte del listado y por orden de llegada: es una fila de
  // espera, no un catálogo. Lo más viejo primero porque es lo que lleva más
  // tiempo sin publicarse.
  const postulaciones = centros
    .filter((c) => c.estado === "postulado")
    .sort(
      (a, b) =>
        new Date(a.actualizado_en).getTime() -
        new Date(b.actualizado_en).getTime()
    );

  const visibles = filtrar(
    centros.filter((c) => c.estado !== "postulado"),
    filtros
  );

  async function rechazar(c: CentroPublico) {
    const motivo = prompt(
      `¿Por qué se rechaza "${c.nombre}"?\n\nQuien lo postuló va a ver este texto en su enlace privado. Sé concreto: "ya existe, mira el de la calle 5" sirve; "no aplica" no.`,
      ""
    );
    if (motivo === null) return;
    await cambiarEstado(c.id, "rechazado", motivo.trim() || "Sin motivo");
  }

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
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              {c.estado}
            </span>
            {/* La edad del dato es el criterio de orden, así que tiene que
                verse en cada fila o el orden parece arbitrario. */}
            <span
              className={`text-xs font-semibold ${
                frescura(c.dato_de).viejo ? "text-red-700" : "text-slate-500"
              }`}
            >
              {haceCuanto(c.dato_de)}
            </span>
            {c.ubicacion_aproximada && (
              <span className="text-xs text-amber-700">ubic. aproximada</span>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href={`/acopio/${c.id}/panel?admin=1`}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
          >
            Editar necesidades
          </Link>
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
          <button
            onClick={() => eliminarLugar(c.id, c.nombre)}
            title="Solo para duplicados o errores: borra el lugar y su historial"
            className="ml-auto rounded-md px-3 py-1.5 text-red-700 hover:bg-red-50"
          >
            Eliminar
          </button>
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

      {convocatorias.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Convocatorias de voluntarios ({convocatorias.length})
          </h2>
          <div className="space-y-3">
            {convocatorias.map((v) => {
              const termino = new Date(v.termina).getTime() < Date.now();
              const faltan =
                v.cupo === null ? null : Math.max(0, v.cupo - v.inscritos);
              return (
                <article
                  key={v.id}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {v.titulo}
                        {v.con_riesgo && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-normal text-amber-900">
                            riesgo
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {v.lugar_encuentro} · {v.ciudad_nombre}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(v.inicia).toLocaleString("es-CO", {
                          timeZone: "America/Bogota",
                        })}
                        {" · "}
                        {v.inscritos} apuntados
                        {faltan !== null && !termino
                          ? ` · faltan ${faltan} de ${v.cupo}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                      {v.estado === "cancelada"
                        ? "cancelada"
                        : termino
                          ? "terminada"
                          : "abierta"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <Link
                      href={`/convocatoria/${v.id}?admin=1`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50"
                    >
                      Ver inscritos y gestionar
                    </Link>
                    {v.telefono && (
                      <a
                        href={`tel:${v.telefono.replace(/\s/g, "")}`}
                        className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                      >
                        Llamar a quien organiza
                      </a>
                    )}
                    <button
                      onClick={() => eliminarConvocatoria(v.id, v.titulo)}
                      title="Solo para duplicados o errores"
                      className="ml-auto rounded-md px-3 py-1.5 text-red-700 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <AdminNoticias token={token} />

      {/* Arriba de todo y siempre visible, incluso vacía: es lo único del
          panel donde alguien está esperando. Si se esconde cuando está en
          cero, se olvida que existe. */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
          Postulaciones por revisar
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              postulaciones.length
                ? "bg-amber-100 text-amber-900"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {postulaciones.length}
          </span>
        </h2>

        {postulaciones.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Nada por revisar. Lo que se registre desde el formulario aparece
            acá y no se publica hasta que lo apruebes.
          </p>
        ) : (
          <div className="space-y-3">
            {postulaciones.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border-[1.5px] border-amber-300 bg-amber-50/60 p-4"
              >
                <Fila c={c} />
                <div className="mt-3 flex flex-wrap gap-2 border-t border-amber-200 pt-3">
                  <button
                    type="button"
                    onClick={() => cambiarEstado(c.id, "pendiente")}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                  >
                    Publicar
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarEstado(c.id, "verificado")}
                    className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    Publicar y verificar
                  </button>
                  <button
                    type="button"
                    onClick={() => rechazar(c)}
                    className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Lugares publicados ({centros.length - postulaciones.length})
        </h2>

        <FiltrosAdmin
          centros={centros.filter((c) => c.estado !== "postulado")}
          valor={filtros}
          onCambio={setFiltros}
          mostrados={visibles.length}
        />

        {visibles.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Ningún lugar coincide con esos filtros.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {visibles.map((c) => (
              <Fila key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
