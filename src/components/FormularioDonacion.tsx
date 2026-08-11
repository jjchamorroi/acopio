"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIAS } from "@/lib/categorias";
import { tipoLugar } from "@/lib/tipos-lugar";
import { RADIO_DIFUSO_M } from "@/lib/constantes";
import type { Ciudad } from "@/lib/tipos";

import AsistenteUbicacion from "./AsistenteUbicacion";
import SelectorCiudad from "./SelectorCiudad";

type Sugerencia = {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  ciudad_nombre: string;
  telefono: string | null;
  estado: string;
  lat: number;
  lng: number;
  distancia_km: number;
  nivel: string | null;
};

const input =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm " +
  "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export default function FormularioDonacion({
  ciudades,
}: {
  ciudades: Ciudad[];
}) {
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [ciudad, setCiudad] = useState<Ciudad | null>(ciudades[0] ?? null);
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    id: string;
    token: string;
    sugerencias: Sugerencia[];
  } | null>(null);

  const centroMapa: [number, number] = useMemo(
    () => (ciudad ? [ciudad.lat, ciudad.lng] : [4.85, -75.7]),
    [ciudad]
  );

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoria) {
      setError("Elegí qué tipo de cosa vas a donar.");
      return;
    }
    if (!ciudad) {
      setError("Elegí el municipio.");
      return;
    }
    if (!punto) {
      setError("Marcá en el mapa la zona donde está la donación.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/donaciones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoria,
          descripcion,
          cantidad: cantidad || null,
          ciudad_slug: ciudad?.slug,
          lat: punto.lat,
          lng: punto.lng,
          contacto: contacto || null,
          telefono,
          notas: notas || null,
        }),
      });
      const datos = await res.json();
      if (!res.ok) {
        throw new Error(
          [datos.error, datos.detalle].filter(Boolean).join(". ") ||
            "No se pudo publicar"
        );
      }
      setResultado(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    const urlPanel = `/donacion/${resultado.id}?t=${encodeURIComponent(resultado.token)}`;
    const cat = CATEGORIAS.find((c) => c.id === categoria);

    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
          <h2 className="text-lg font-semibold text-emerald-900">
            Donación publicada
          </h2>
          <p className="mt-1 text-sm text-emerald-900">
            En el mapa aparece solo la <strong>zona aproximada</strong>. Tu
            dirección exacta no se publica: la coordinás por teléfono con quien
            venga.
          </p>
        </div>

        {resultado.sugerencias.length > 0 ? (
          <section>
            <h3 className="text-base font-semibold text-slate-900">
              Si podés llevarlo vos, acá lo necesitan
            </h3>
            <p className="mb-3 text-sm text-slate-600">
              Estos lugares cerca tuyo pidieron{" "}
              <strong>{cat?.label?.toLowerCase() ?? categoria}</strong>. Llamá
              antes de salir.
            </p>
            <ul className="space-y-2">
              {resultado.sugerencias.map((s) => {
                const t = tipoLugar(s.tipo);
                return (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          <span aria-hidden>{t?.emoji}</span> {s.nombre}
                          {s.nivel === "urgente" && (
                            <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                              lo necesita urgente
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-slate-600">{s.direccion}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-slate-500">
                        a {s.distancia_km} km
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      {s.telefono && (
                        <a
                          href={`tel:${s.telefono.replace(/\s/g, "")}`}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          Llamar {s.telefono}
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-blue-700 hover:underline"
                      >
                        Cómo llegar
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Por ahora no hay lugares cerca pidiendo eso. Tu donación ya quedó
            publicada: cuando alguien la necesite, te va a llamar.
          </p>
        )}

        <div className="rounded-lg border border-slate-300 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">
            Guardá este enlace
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Es con lo que marcás la donación como entregada. No lo vamos a
            volver a mostrar.
          </p>
          <code className="mt-2 block break-all rounded bg-slate-100 p-3 text-xs">
            {typeof window !== "undefined" ? window.location.origin : ""}
            {urlPanel}
          </code>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(window.location.origin + urlPanel)
            }
            className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Copiar enlace
          </button>
        </div>

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

  return (
    <form onSubmit={enviar} className="space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          1. Qué tenés para donar
        </legend>

        <div>
          <span className="mb-2 block text-xs font-medium text-slate-600">
            Tipo *
          </span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIAS.map((c) => {
              const activo = categoria === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoria(c.id)}
                  aria-pressed={activo}
                  className={`rounded-full px-3 py-1.5 text-xs ring-1 ring-inset transition ${
                    activo
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span aria-hidden>{c.emoji}</span> {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            ¿Qué es exactamente? *
          </span>
          <input
            className={input}
            required
            minLength={3}
            maxLength={300}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Colchonetas nuevas, agua en botellón, ropa de niño…"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Cantidad
          </span>
          <input
            className={input}
            maxLength={80}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="20 unidades, 3 cajas, media tonelada…"
          />
        </label>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          2. Dónde está
        </legend>

        <div className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          En el mapa público se muestra una <strong>zona de unos {RADIO_DIFUSO_M} metros</strong>,
          nunca el punto exacto. Tu dirección no se publica: se la das por
          teléfono a quien venga.
        </div>

        <div className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Municipio *
          </span>
          <SelectorCiudad valor={ciudad} onCambio={setCiudad} requerido />
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Marcá en el mapa dónde está *
          </span>
          <AsistenteUbicacion
            valor={punto}
            centroInicial={centroMapa}
            ciudadNombre={ciudad?.nombre}
            onCambio={(lat, lng) => setPunto({ lat, lng })}
          />
          <p className="mt-1 text-xs text-slate-500">
            {punto ? "Ubicación marcada." : "Sin marcar todavía."}
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          3. Cómo te contactan
        </legend>

        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Tu teléfono <strong>sí se publica</strong>, para que un acopio o un
          voluntario pueda coordinar la recogida. Si no querés que sea público,
          mejor llevá la donación directamente a un acopio.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Tu nombre
            </span>
            <input
              className={input}
              maxLength={120}
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Teléfono *
            </span>
            <input
              className={input}
              required
              inputMode="tel"
              minLength={7}
              maxLength={40}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="300 000 0000"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Notas
          </span>
          <textarea
            className={input}
            rows={2}
            maxLength={300}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Solo puedo entregarlo en las mañanas, es pesado y hace falta ayuda para cargarlo…"
          />
        </label>
      </fieldset>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
      >
        {enviando ? "Publicando…" : "Publicar donación"}
      </button>
    </form>
  );
}
