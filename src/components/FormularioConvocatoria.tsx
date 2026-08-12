"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AsistenteUbicacion from "./AsistenteUbicacion";
import SelectorCiudad from "./SelectorCiudad";
import type { Ciudad } from "@/lib/tipos";

const input =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm " +
  "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

/** "2026-08-12T06:00" en hora local, que es lo que espera datetime-local. */
function paraInput(fecha: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}T${p(fecha.getHours())}:${p(fecha.getMinutes())}`;
}

export default function FormularioConvocatoria({
  ciudades,
}: {
  ciudades: Ciudad[];
}) {
  const manana = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(6, 0, 0, 0);
    return d;
  }, []);
  const mananaFin = useMemo(() => {
    const d = new Date(manana);
    d.setHours(14, 0, 0, 0);
    return d;
  }, [manana]);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ciudad, setCiudad] = useState<Ciudad | null>(ciudades[0] ?? null);
  const [lugarEncuentro, setLugarEncuentro] = useState("");
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null);
  const [inicia, setInicia] = useState(paraInput(manana));
  const [termina, setTermina] = useState(paraInput(mananaFin));
  const [conCupo, setConCupo] = useState(true);
  const [cupo, setCupo] = useState("10");
  const [queLlevar, setQueLlevar] = useState("");
  const [requisitos, setRequisitos] = useState("");
  const [conRiesgo, setConRiesgo] = useState(false);
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ id: string; token: string } | null>(
    null
  );

  const centroMapa: [number, number] = useMemo(
    () => (ciudad ? [ciudad.lat, ciudad.lng] : [4.85, -75.7]),
    [ciudad]
  );

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ciudad) return setError("Elegí el municipio.");
    if (!punto) return setError("Marcá en el mapa el punto de encuentro.");

    setEnviando(true);
    try {
      const res = await fetch("/api/convocatorias", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titulo,
          descripcion,
          ciudad_slug: ciudad.slug,
          lugar_encuentro: lugarEncuentro,
          lat: punto.lat,
          lng: punto.lng,
          // datetime-local da hora local sin zona; el Date la interpreta en la
          // del navegador y toISOString la convierte a UTC para el servidor.
          inicia: new Date(inicia).toISOString(),
          termina: new Date(termina).toISOString(),
          cupo: conCupo ? Number(cupo) : null,
          que_llevar: queLlevar || null,
          requisitos: requisitos || null,
          con_riesgo: conRiesgo,
          contacto: contacto || null,
          telefono: telefono || null,
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
    const url = `/convocatoria/${resultado.id}?t=${encodeURIComponent(resultado.token)}`;
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
        <h2 className="text-lg font-semibold text-emerald-900">
          Convocatoria publicada
        </h2>
        <p className="mt-1 text-sm text-emerald-900">
          Ya aparece en el listado de voluntarios.
        </p>

        <div className="mt-4 rounded-md border border-emerald-300 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">Guardá este enlace</p>
          <p className="mt-1 text-xs text-slate-600">
            Es con lo que ves <strong>quiénes se apuntaron y sus teléfonos</strong>,
            y con lo que podés cancelarla. No lo vamos a volver a mostrar.
          </p>
          <code className="mt-2 block break-all rounded bg-slate-100 p-3 text-xs">
            {typeof window !== "undefined" ? window.location.origin : ""}
            {url}
          </code>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(window.location.origin + url)
            }
            className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Copiar enlace
          </button>
        </div>

        <div className="mt-4 flex gap-4 text-sm">
          <Link href={url} className="font-medium text-emerald-800 underline">
            Ir a la convocatoria
          </Link>
          <Link href="/voluntarios" className="font-medium text-emerald-800 underline">
            Ver todas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          1. Qué hay que hacer
        </legend>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            En una línea *
          </span>
          <input
            className={input}
            required
            minLength={5}
            maxLength={120}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Remoción de escombros · Empacar mercados · Cocinar para 200"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Explicá para qué *
          </span>
          <textarea
            className={input}
            required
            minLength={10}
            maxLength={600}
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Qué se va a hacer, con quién se coordina y qué esperar."
          />
        </label>

        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-amber-700"
            checked={conRiesgo}
            onChange={(e) => setConRiesgo(e.target.checked)}
          />
          <span className="text-sm text-amber-900">
            <strong>Es un trabajo con riesgo</strong> (escombros, estructuras
            dañadas, altura).
            <span className="mt-0.5 block text-xs">
              Se muestra una advertencia. Este tipo de trabajo{" "}
              <strong>debe estar coordinado por un organismo de socorro</strong>:
              el voluntariado espontáneo en edificios colapsados lesiona gente y
              estorba a los rescatistas.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          2. Cuándo y cuántos
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Empieza *
            </span>
            <input
              type="datetime-local"
              className={input}
              required
              value={inicia}
              onChange={(e) => setInicia(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Termina *
            </span>
            <input
              type="datetime-local"
              className={input}
              required
              value={termina}
              onChange={(e) => setTermina(e.target.value)}
            />
          </label>
        </div>

        <div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-slate-900"
              checked={conCupo}
              onChange={(e) => setConCupo(e.target.checked)}
            />
            <span className="text-sm text-slate-800">
              Limitar el número de personas
            </span>
          </label>
          {conCupo && (
            <div className="mt-2">
              <input
                type="number"
                min={1}
                max={5000}
                className={`${input} max-w-32`}
                value={cupo}
                onChange={(e) => setCupo(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Evita que lleguen doscientas personas a un trabajo para diez —
                que después hay que alimentar y coordinar.
              </p>
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          3. Dónde se encuentran
        </legend>

        <div className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Municipio *
          </span>
          <SelectorCiudad valor={ciudad} onCambio={setCiudad} requerido />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Punto de encuentro *
          </span>
          <input
            className={input}
            required
            minLength={5}
            maxLength={200}
            value={lugarEncuentro}
            onChange={(e) => setLugarEncuentro(e.target.value)}
            placeholder="Parque principal, junto a la iglesia"
          />
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Marcalo en el mapa *
          </span>
          <AsistenteUbicacion
            valor={punto}
            centroInicial={centroMapa}
            ciudadNombre={ciudad?.nombre}
            onCambio={(lat, lng) => setPunto({ lat, lng })}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          4. Qué necesita quien vaya
        </legend>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Qué tiene que llevar
          </span>
          <input
            className={input}
            maxLength={300}
            value={queLlevar}
            onChange={(e) => setQueLlevar(e.target.value)}
            placeholder="Guantes, botas, agua propia, almuerzo, gorra"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Importante: quien llega sin agua ni comida deja de ser ayuda y pasa
            a ser alguien más a quien cuidar.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Requisitos
          </span>
          <input
            className={input}
            maxLength={300}
            value={requisitos}
            onChange={(e) => setRequisitos(e.target.value)}
            placeholder="Mayor de edad · buena condición física · con carro · enfermería"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Quién coordina
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
              Teléfono de contacto
            </span>
            <input
              className={input}
              inputMode="tel"
              maxLength={40}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
      >
        {enviando ? "Publicando…" : "Publicar convocatoria"}
      </button>
    </form>
  );
}
