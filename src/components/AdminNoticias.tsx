"use client";

import { useCallback, useEffect, useState } from "react";
import type { NoticiaPublica } from "@/lib/tipos";

/**
 * Editor de avisos de la portada.
 *
 * Se envía como FormData y no como JSON porque lleva un archivo: convertir la
 * imagen a base64 para meterla en un JSON la infla un 33 % y obliga a leerla
 * entera en memoria dos veces.
 */

const input =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm " +
  "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

const VACIO = {
  titulo: "",
  cuerpo: "",
  enlace: "",
  enlace_texto: "",
  vence_en: "",
  urgente: false,
  activa: true,
  orden: 0,
};

export default function AdminNoticias({ token }: { token: string }) {
  const [noticias, setNoticias] = useState<NoticiaPublica[]>([]);
  const [form, setForm] = useState({ ...VACIO });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/noticias?todas=1", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const { noticias } = (await res.json()) as { noticias: NoticiaPublica[] };
      setNoticias(noticias);
    } catch {
      // El resto del panel sirve igual sin los avisos.
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function limpiar() {
    setForm({ ...VACIO });
    setArchivo(null);
    setEditando(null);
    setError(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    const datos = new FormData();
    datos.set("titulo", form.titulo);
    datos.set("cuerpo", form.cuerpo);
    datos.set("enlace", form.enlace);
    datos.set("enlace_texto", form.enlace_texto);
    datos.set("vence_en", form.vence_en);
    datos.set("urgente", form.urgente ? "1" : "0");
    datos.set("activa", form.activa ? "1" : "0");
    datos.set("orden", String(form.orden));
    if (archivo) datos.set("imagen", archivo);

    try {
      const res = await fetch(
        editando ? `/api/noticias/${editando}` : "/api/noticias",
        {
          method: editando ? "PATCH" : "POST",
          headers: { authorization: `Bearer ${token}` },
          body: datos,
        }
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar");
      limpiar();
      setAbierto(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function alternar(n: NoticiaPublica) {
    const datos = new FormData();
    datos.set("activa", n.activa ? "0" : "1");
    await fetch(`/api/noticias/${n.id}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}` },
      body: datos,
    });
    await cargar();
  }

  async function eliminar(n: NoticiaPublica) {
    if (!confirm(`¿Eliminar el aviso "${n.titulo}"?`)) return;
    await fetch(`/api/noticias/${n.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    await cargar();
  }

  function editar(n: NoticiaPublica) {
    setEditando(n.id);
    setForm({
      titulo: n.titulo,
      cuerpo: n.cuerpo ?? "",
      enlace: n.enlace ?? "",
      enlace_texto: n.enlace_texto ?? "",
      // El input datetime-local quiere "YYYY-MM-DDTHH:mm" sin zona.
      vence_en: n.vence_en ? n.vence_en.slice(0, 16) : "",
      urgente: n.urgente,
      activa: n.activa,
      orden: n.orden,
    });
    setArchivo(null);
    setAbierto(true);
    setError(null);
  }

  const vencida = (n: NoticiaPublica) =>
    n.vence_en !== null && new Date(n.vence_en).getTime() < Date.now();

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Avisos de la portada ({noticias.filter((n) => n.activa && !vencida(n)).length} visibles)
        </h2>
        <button
          type="button"
          onClick={() => {
            if (abierto) limpiar();
            setAbierto(!abierto);
          }}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-700"
        >
          {abierto ? "Cancelar" : "+ Nuevo aviso"}
        </button>
      </div>

      {abierto && (
        <form
          onSubmit={guardar}
          className="mb-4 space-y-3 rounded-lg border border-slate-300 bg-white p-4"
        >
          <div>
            <label className="text-sm font-medium text-slate-900">Título</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className={input}
              maxLength={160}
              required
              placeholder="Jornada de recolección este sábado en el Coliseo"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-900">
              Texto <span className="text-slate-500">(opcional)</span>
            </label>
            <textarea
              value={form.cuerpo}
              onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
              className={`${input} min-h-24`}
              maxLength={1200}
              placeholder="De 8:00 a. m. a 4:00 p. m. Se reciben alimentos no perecederos y aseo."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-900">
              Imagen <span className="text-slate-500">(opcional, máx. 2 MB)</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            {editando && !archivo && (
              <p className="mt-1 text-xs text-slate-500">
                Si no eliges una nueva, se conserva la que ya tiene.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-900">
                Enlace <span className="text-slate-500">(opcional)</span>
              </label>
              <input
                value={form.enlace}
                onChange={(e) => setForm({ ...form, enlace: e.target.value })}
                className={input}
                placeholder="/guia  o  https://…"
              />
              <p className="mt-1 text-xs text-slate-500">
                Puede ser una página del sitio (<code>/guia</code>) o externa.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900">
                Texto del enlace
              </label>
              <input
                value={form.enlace_texto}
                onChange={(e) =>
                  setForm({ ...form, enlace_texto: e.target.value })
                }
                className={input}
                maxLength={60}
                placeholder="Ver más"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-900">
                Se baja solo el{" "}
                <span className="text-slate-500">(opcional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.vence_en}
                onChange={(e) => setForm({ ...form, vence_en: e.target.value })}
                className={input}
              />
              <p className="mt-1 text-xs text-slate-500">
                Una jornada del sábado no debería seguir anunciada el lunes.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900">
                Orden <span className="text-slate-500">(mayor = más arriba)</span>
              </label>
              <input
                type="number"
                value={form.orden}
                onChange={(e) =>
                  setForm({ ...form, orden: Number(e.target.value) || 0 })
                }
                className={input}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.urgente}
                onChange={(e) =>
                  setForm({ ...form, urgente: e.target.checked })
                }
              />
              Urgente (se pinta en rojo)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={(e) => setForm({ ...form, activa: e.target.checked })}
              />
              Visible
            </label>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={guardando || !form.titulo.trim()}
            className="rounded-md bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {guardando
              ? "Guardando…"
              : editando
                ? "Guardar cambios"
                : "Publicar aviso"}
          </button>
        </form>
      )}

      {noticias.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Sin avisos. Sirven para lo que el mapa no puede decir porque no es un
          lugar: una jornada, un cambio de punto, una advertencia.
        </p>
      ) : (
        <div className="space-y-2">
          {noticias.map((n) => (
            <div
              key={n.id}
              className={`flex flex-wrap items-start gap-3 rounded-lg border p-3 ${
                n.activa && !vencida(n)
                  ? "border-slate-200 bg-white"
                  : "border-slate-200 bg-slate-50 opacity-70"
              }`}
            >
              {n.tiene_imagen && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/noticias/${n.id}/imagen`}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">
                  {n.urgente && <span className="text-red-700">⚠ </span>}
                  {n.titulo}
                </p>
                <p className="text-xs text-slate-500">
                  {n.activa ? "visible" : "oculto"}
                  {vencida(n) ? " · vencido" : ""}
                  {n.vence_en && !vencida(n)
                    ? ` · hasta ${new Date(n.vence_en).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}`
                    : ""}
                  {n.enlace ? ` · enlaza a ${n.enlace}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => editar(n)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => alternar(n)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  {n.activa ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(n)}
                  className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
