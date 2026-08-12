"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SelectorCiudad from "./SelectorCiudad";
import AvisoPublico from "./AvisoPublico";
import {
  PROFESIONES,
  MODALIDADES,
  profesion as buscarProfesion,
  type ProfesionId,
  type ModalidadId,
} from "@/lib/profesiones";
import type { Ciudad } from "@/lib/tipos";

const input =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm " +
  "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export default function FormularioProfesional({
  ciudades,
}: {
  ciudades: Ciudad[];
}) {
  const [nombre, setNombre] = useState("");
  const [prof, setProf] = useState<ProfesionId>("psicologia");
  const [registro, setRegistro] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadId>("ambas");
  const [ciudad, setCiudad] = useState<Ciudad | null>(ciudades[0] ?? null);
  const [disponibilidad, setDisponibilidad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [telefonoPublico, setTelefonoPublico] = useState(true);
  const [email, setEmail] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ id: string; token: string } | null>(
    null
  );

  const datosProfesion = useMemo(() => buscarProfesion(prof), [prof]);
  const necesitaCiudad = modalidad !== "remoto";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (necesitaCiudad && !ciudad) {
      setError("Indicá el municipio donde podés atender presencialmente.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/profesionales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nombre,
          profesion: prof,
          registro: registro || null,
          descripcion,
          modalidad,
          ciudad_slug: necesitaCiudad ? ciudad?.slug : null,
          disponibilidad: disponibilidad || null,
          telefono,
          telefono_publico: telefonoPublico,
          email: email || null,
        }),
      });
      const datos = await res.json();
      if (!res.ok) {
        throw new Error(
          [datos.error, datos.detalle].filter(Boolean).join(". ") ||
            "No se pudo registrar"
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
    const url = `/profesional/${resultado.id}?t=${encodeURIComponent(resultado.token)}`;
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
        <h2 className="text-lg font-semibold text-emerald-900">
          Registro enviado
        </h2>
        <p className="mt-2 text-sm text-emerald-900">
          Ya aparecés en el directorio marcado como{" "}
          <strong>sin verificar</strong>. Alguien del equipo va a confirmar tus
          datos antes de ponerte el sello.
        </p>

        <div className="mt-4 rounded-md border border-emerald-300 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">Guardá este enlace</p>
          <p className="mt-1 text-xs text-slate-600">
            Con él actualizás tu disponibilidad o te das de baja. No lo vamos a
            volver a mostrar.
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

        <Link
          href="/profesionales"
          className="mt-4 inline-block text-sm font-medium text-emerald-800 underline"
        >
          Ver el directorio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          1. Quién sos
        </legend>

        <AvisoPublico campos="Tu nombre, tu profesión y tu número de registro">
          El registro se publica para que cualquiera pueda comprobarlo por su
          cuenta en el registro oficial. Es lo que separa a un profesional de
          alguien que dice serlo.
        </AvisoPublico>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Nombre completo *
          </span>
          <input
            className={input}
            required
            minLength={3}
            maxLength={120}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Profesión *
          </span>
          <select
            className={input}
            value={prof}
            onChange={(e) => setProf(e.target.value as ProfesionId)}
          >
            {PROFESIONES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {datosProfesion?.registroNombre ?? "Registro profesional"}
            {datosProfesion?.registroObligatorio ? " *" : " (opcional)"}
          </span>
          <input
            className={input}
            required={datosProfesion?.registroObligatorio}
            maxLength={60}
            value={registro}
            onChange={(e) => setRegistro(e.target.value)}
            placeholder="Número tal como aparece en el registro"
          />
          {datosProfesion?.registroObligatorio && (
            <span className="mt-1 block text-xs text-slate-500">
              Sin este número nadie puede comprobar que ejercés, y en salud eso
              importa: quien atiende sin serlo hace daño.
            </span>
          )}
        </label>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          2. Qué ofrecés
        </legend>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Describilo *
          </span>
          <textarea
            className={input}
            required
            minLength={10}
            maxLength={600}
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Primeros auxilios psicológicos para adultos y niños, sin costo, hasta tres sesiones."
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-medium text-slate-600">
            ¿Cómo atendés? *
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MODALIDADES) as ModalidadId[]).map((m) => {
              const activo = modalidad === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalidad(m)}
                  aria-pressed={activo}
                  className={`rounded-full px-3 py-1.5 text-xs ring-1 ring-inset transition ${
                    activo
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {MODALIDADES[m].label}
                </button>
              );
            })}
          </div>
        </div>

        {necesitaCiudad && (
          <div className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Municipio donde atendés *
            </span>
            <SelectorCiudad valor={ciudad} onCambio={setCiudad} requerido />
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Disponibilidad
          </span>
          <input
            className={input}
            maxLength={200}
            value={disponibilidad}
            onChange={(e) => setDisponibilidad(e.target.value)}
            placeholder="Tardes entre semana · fines de semana · 24 horas"
          />
        </label>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          3. Cómo te contactan
        </legend>

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
          />
        </label>

        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-slate-900"
            checked={telefonoPublico}
            onChange={(e) => setTelefonoPublico(e.target.checked)}
          />
          <span className="text-sm text-slate-800">
            Publicar mi teléfono
            <span className="mt-0.5 block text-xs text-slate-600">
              Si lo publicás te pueden llamar directo, que es lo más rápido para
              quien necesita ayuda. Pensalo bien igual: en salud mental un
              número abierto puede sonar a cualquier hora y agotarte en una
              semana. Si lo dejás sin marcar, dejá un correo abajo.
            </span>
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Correo {telefonoPublico ? "(opcional)" : "— recomendado"}
          </span>
          <input
            type="email"
            className={input}
            maxLength={120}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Si lo escribís, se publica.
          </span>
        </label>

        {!telefonoPublico && !email && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Sin teléfono público ni correo, <strong>nadie va a poder
            contactarte</strong> y tu registro no le va a servir a nadie.
          </p>
        )}
      </fieldset>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <p className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Al registrarte declarás que la información es cierta y que estás
        habilitado para ejercer. Publicar datos falsos sobre una profesión de
        salud puede tener consecuencias legales.{" "}
        <Link href="/aviso" className="font-medium text-slate-700 underline">
          Aviso legal
        </Link>
      </p>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
      >
        {enviando ? "Enviando…" : "Ofrecer mis servicios"}
      </button>
    </form>
  );
}
