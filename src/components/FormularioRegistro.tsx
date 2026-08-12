"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIAS, NIVELES, type NivelId } from "@/lib/categorias";
import { TIPOS_LUGAR, type TipoLugarId } from "@/lib/tipos-lugar";
import type { Ciudad } from "@/lib/tipos";

import AsistenteUbicacion from "./AsistenteUbicacion";
import SelectorCiudad from "./SelectorCiudad";
import AvisoPublico from "./AvisoPublico";

type Seleccion = Record<string, NivelId | "">;

const input =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm " +
  "focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export default function FormularioRegistro({
  ciudades,
}: {
  ciudades: Ciudad[];
}) {
  const [tipo, setTipo] = useState<TipoLugarId>("acopio");
  const [atiende, setAtiende] = useState("");
  const [tiposSangre, setTiposSangre] = useState("");
  const [aceptaMascotas, setAceptaMascotas] = useState<boolean | null>(null);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState<Ciudad | null>(ciudades[0] ?? null);
  const [responsable, setResponsable] = useState("");
  const [telefono, setTelefono] = useState("");
  const [horario, setHorario] = useState("");
  const [notas, setNotas] = useState("");
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null);
  const [necesidades, setNecesidades] = useState<Seleccion>({});

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

    if (!ciudad) {
      setError("Elegí el municipio.");
      return;
    }
    if (!punto) {
      setError("Marcá la ubicación exacta en el mapa antes de continuar.");
      return;
    }

    const lista = Object.entries(necesidades)
      .filter(([, nivel]) => nivel !== "")
      .map(([categoria, nivel]) => ({ categoria, nivel: nivel as NivelId }));

    setEnviando(true);
    try {
      const res = await fetch("/api/acopios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo,
          atiende: atiende || null,
          tipos_sangre: tipo === "sangre" ? tiposSangre || null : null,
          // Solo tiene sentido informarlo donde duerme gente. En los demás
          // tipos va null para no llenar la base de datos irrelevantes.
          acepta_mascotas: tipo === "albergue" ? aceptaMascotas : null,
          nombre,
          direccion,
          ciudad_slug: ciudad?.slug,
          lat: punto.lat,
          lng: punto.lng,
          responsable: responsable || null,
          telefono: telefono || null,
          horario: horario || null,
          notas: notas || null,
          necesidades: lista,
        }),
      });
      const datos = await res.json();
      if (!res.ok) {
        // El 429 trae un `detalle` con cuánto hay que esperar; sin él el
        // mensaje quedaría en un "demasiadas peticiones" que no dice qué hacer.
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
    const urlPanel = `/acopio/${resultado.id}/panel?t=${encodeURIComponent(resultado.token)}`;
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
        <h2 className="text-lg font-semibold text-emerald-900">
          Acopio registrado
        </h2>
        <p className="mt-2 text-sm text-emerald-900">
          Ya aparece en el mapa marcado como <strong>sin verificar</strong>.
          Alguien del equipo lo va a confirmar por teléfono.
        </p>

        <div className="mt-4 rounded-md border border-emerald-300 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">
            Guardá este enlace. Es el único.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Con él actualizás qué necesitan sin crear ninguna cuenta. No lo
            vamos a volver a mostrar y no lo podemos recuperar.
          </p>
          <code className="mt-3 block break-all rounded bg-slate-100 p-3 text-xs">
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

        <div className="mt-4 flex gap-3 text-sm">
          <Link href={urlPanel} className="font-medium text-emerald-800 underline">
            Ir al panel
          </Link>
          <Link href="/" className="font-medium text-emerald-800 underline">
            Ver el mapa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          1. El lugar
        </legend>

        <AvisoPublico campos="El nombre, la dirección y el teléfono del lugar">
          Aparecen en el mapa para que la gente pueda llegar y confirmar antes
          de salir: es el propósito del sitio.
        </AvisoPublico>

        <div>
          <span className="mb-2 block text-xs font-medium text-slate-600">
            ¿Qué tipo de lugar es? *
          </span>
          <div className="grid gap-2 sm:grid-cols-2">
            {TIPOS_LUGAR.map((t) => {
              const activo = tipo === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  aria-pressed={activo}
                  className={`rounded-lg border p-3 text-left transition ${
                    activo
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-medium">
                    <span aria-hidden>{t.emoji}</span> {t.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${activo ? "text-slate-300" : "text-slate-500"}`}
                  >
                    {t.ayuda}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {tipo === "albergue" && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
            <span className="block text-sm font-medium text-emerald-900">
              🐾 ¿Reciben personas con mascotas?
            </span>
            <p className="mt-0.5 text-xs text-emerald-800">
              Mucha gente no evacúa por no abandonar a su animal. Este dato es
              de los más buscados y casi nadie lo publica.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { v: true as const, t: "Sí, las recibimos" },
                { v: false as const, t: "No podemos" },
                { v: null, t: "Todavía no sé" },
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
          </div>
        )}

        {tipo === "sangre" && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-3">
            <label className="block">
              <span className="block text-sm font-medium text-rose-900">
                🩸 ¿Qué tipos de sangre necesitan?
              </span>
              <p className="mt-0.5 mb-2 text-xs text-rose-800">
                Escribilo como lo dicen ellos: &quot;urgente O negativo&quot;,
                &quot;todos los tipos&quot;. Es lo primero que mira quien está
                decidiendo si vale la pena ir.
              </p>
              <input
                className={input}
                maxLength={120}
                value={tiposSangre}
                onChange={(e) => setTiposSangre(e.target.value)}
                placeholder="O−, O+ · todos los tipos"
              />
            </label>
          </div>
        )}

        {(tipo === "institucion" || tipo === "albergue" || tipo === "comedor") && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              ¿A quién atiende?
            </span>
            <input
              className={input}
              maxLength={120}
              value={atiende}
              onChange={(e) => setAtiende(e.target.value)}
              placeholder={
                tipo === "comedor"
                  ? "200 almuerzos diarios, 60 familias del barrio…"
                  : "80 adultos mayores, 12 familias, 300 niños…"
              }
            />
            <span className="mt-1 block text-xs text-slate-500">
              Es lo que hace que un donante entienda a dónde va lo suyo.
            </span>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Nombre del lugar *
          </span>
          <input
            className={input}
            required
            maxLength={120}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Coliseo del barrio, parroquia, colegio…"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Municipio *
            </span>
            <SelectorCiudad valor={ciudad} onCambio={setCiudad} requerido />
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Horario de atención
            </span>
            <input
              className={input}
              maxLength={120}
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              placeholder="8:00 a.m. - 6:00 p.m."
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Dirección *
          </span>
          <input
            className={input}
            required
            minLength={5}
            maxLength={200}
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Calle 00 # 00-00, barrio"
          />
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Ubicación exacta * — tocá el mapa donde queda la entrada
          </span>
          <AsistenteUbicacion
            valor={punto}
            centroInicial={centroMapa}
            ciudadNombre={ciudad?.nombre}
            onCambio={(lat, lng) => setPunto({ lat, lng })}
          />
          <p className="mt-1 text-xs text-slate-500">
            {punto
              ? `Marcado en ${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}`
              : "Sin marcar todavía."}
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          2. Contacto
        </legend>
        <p className="text-xs text-slate-600">
          Poné el teléfono <strong>del lugar</strong>, no el tuyo: va a sonar a
          cualquier hora, y a mucha gente.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Responsable
            </span>
            <input
              className={input}
              maxLength={120}
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
            />
          </label>

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
              placeholder="300 000 0000"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          3. ¿Qué necesitan?
        </legend>
        <p className="text-xs text-slate-500">
          Marcá solo lo que aplique. Decir <strong>qué les sobra</strong> es tan
          útil como decir qué les falta: evita que sigan llegando camiones de lo
          mismo.
        </p>

        <div className="divide-y divide-slate-100">
          {CATEGORIAS.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-wrap items-center gap-2 py-2"
            >
              <span className="w-56 shrink-0 text-sm text-slate-800">
                <span aria-hidden>{cat.emoji}</span> {cat.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(["", "urgente", "necesita", "sobra"] as const).map((nivel) => {
                  const activo = (necesidades[cat.id] ?? "") === nivel;
                  const etiqueta =
                    nivel === "" ? "—" : NIVELES[nivel as NivelId].label;
                  return (
                    <button
                      key={nivel || "ninguno"}
                      type="button"
                      onClick={() =>
                        setNecesidades((prev) => ({ ...prev, [cat.id]: nivel }))
                      }
                      className={`rounded-full px-3 py-1 text-xs ring-1 ring-inset transition ${
                        activo
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Notas para quien vaya a donar
          </span>
          <textarea
            className={input}
            rows={3}
            maxLength={500}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Entrada por la parte de atrás, no recibimos ropa usada, se necesita ayuda para descargar…"
          />
        </label>
      </fieldset>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <p className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Al registrar el lugar confirmás que los datos son ciertos y autorizás
        su publicación en el mapa. Podés corregirlos o retirarlos cuando
        quieras con el enlace privado que recibís.{" "}
        <Link href="/aviso" className="font-medium text-slate-700 underline">
          Aviso legal
        </Link>
      </p>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
      >
        {enviando ? "Registrando…" : "Registrar acopio"}
      </button>
    </form>
  );
}
