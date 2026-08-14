"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [yaTieneImagen, setYaTieneImagen] = useState(false);
  const [quitar, setQuitar] = useState(false);
  const refArchivo = useRef<HTMLInputElement>(null);

  const MAX = 2 * 1024 * 1024;

  /**
   * Se valida en el navegador ANTES de subir. Con datos móviles, enterarse de
   * que la foto pesaba 9 MB después de haberla subido entera es el peor
   * momento posible para decirlo.
   */
  function elegirArchivo(f: File | null) {
    setErrorImagen(null);
    if (!f) return;
    if (f.size > MAX) {
      setErrorImagen(
        `Pesa ${(f.size / 1048576).toFixed(1)} MB y el máximo son 2 MB. Redúcela e inténtalo de nuevo.`
      );
      if (refArchivo.current) refArchivo.current.value = "";
      return;
    }
    setArchivo(f);
    setQuitar(false);
    setVistaPrevia(URL.createObjectURL(f));
  }

  function quitarImagen() {
    setArchivo(null);
    setVistaPrevia(null);
    setErrorImagen(null);
    // Si la ficha ya tenía una guardada, hay que decirle al servidor que la
    // borre; limpiar el input solo evita mandar una nueva.
    if (yaTieneImagen) setQuitar(true);
    if (refArchivo.current) refArchivo.current.value = "";
  }

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
    setVistaPrevia(null);
    setErrorImagen(null);
    setYaTieneImagen(false);
    setQuitar(false);
    if (refArchivo.current) refArchivo.current.value = "";
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
    if (quitar && !archivo) datos.set("quitar_imagen", "1");

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
    setVistaPrevia(null);
    setYaTieneImagen(n.tiene_imagen);
    setQuitar(false);
    setAbierto(true);
    setError(null);
    setErrorImagen(null);
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

            {/* El input de archivo nativo va oculto y se dispara desde un
                botón normal: "Seleccionar archivo · Sin archivos" no se lee
                como algo en lo que haya que hacer clic. */}
            <input
              ref={refArchivo}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
              className="hidden"
            />

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => refArchivo.current?.click()}
                className="rounded-md border-[1.5px] border-slate-800 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
              >
                {vistaPrevia || (editando && yaTieneImagen)
                  ? "Cambiar imagen"
                  : "📷 Subir imagen"}
              </button>

              {(vistaPrevia || (editando && yaTieneImagen)) && (
                <button
                  type="button"
                  onClick={quitarImagen}
                  className="text-sm font-semibold text-red-700 underline"
                >
                  Quitar
                </button>
              )}
            </div>

            {/* Ver la imagen antes de publicar evita el error más tonto:
                subir la que no era y enterarse en la portada. */}
            {(vistaPrevia || (editando && yaTieneImagen)) && (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vistaPrevia ?? `/api/noticias/${editando}/imagen`}
                  alt=""
                  className="h-20 w-32 rounded border border-slate-200 object-cover"
                />
                <span className="text-xs text-slate-600">
                  {archivo
                    ? `${archivo.name} · ${(archivo.size / 1024).toFixed(0)} KB`
                    : "Imagen actual"}
                </span>
              </div>
            )}

            {errorImagen && (
              <p className="mt-1 text-xs font-semibold text-red-700">
                {errorImagen}
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
              // En móvil se apila; solo a partir de sm se pone en fila. Con
              // flex-wrap a secas, los tres botones y el texto competían por
              // 360 px y todo salía partido a la mitad.
              className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start ${
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
                  className="h-28 w-full shrink-0 rounded object-cover sm:h-14 sm:w-20"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold text-slate-900">
                  {n.urgente && <span className="text-red-700">⚠ </span>}
                  {n.titulo}
                </p>
                <p className="text-xs text-slate-500">
                  {n.activa ? "visible" : "oculto"}
                  {vencida(n) ? " · vencido" : ""}
                  {n.vence_en && !vencida(n)
                    ? ` · hasta ${new Date(n.vence_en).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}`
                    : ""}
                </p>
                {/* El enlace va en su propia línea y truncado: una URL larga no
                    tiene espacios donde partirse, así que estirada rompía la
                    fila entera y empujaba los botones fuera de la tarjeta. */}
                {n.enlace && (
                  <p
                    className="truncate text-xs text-slate-500"
                    title={n.enlace}
                  >
                    enlaza a {n.enlace}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
                <button
                  type="button"
                  onClick={() => editar(n)}
                  className="flex-1 whitespace-nowrap rounded border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 sm:flex-none sm:py-1.5"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => alternar(n)}
                  className="flex-1 whitespace-nowrap rounded border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 sm:flex-none sm:py-1.5"
                >
                  {n.activa ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(n)}
                  className="flex-1 whitespace-nowrap rounded border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 sm:flex-none sm:py-1.5"
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
