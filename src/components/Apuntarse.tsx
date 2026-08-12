"use client";

import { useEffect, useState } from "react";
import { Cupo } from "./TarjetaConvocatoria";
import type { ConvocatoriaPublica } from "@/lib/tipos";

/**
 * Apuntarse a una convocatoria sin crear cuenta.
 *
 * El token de baja se guarda en localStorage del navegador: la persona vuelve
 * a la página y ve "ya estás apuntado" con la opción de cancelar, sin haber
 * tenido que guardar ningún enlace. Si limpia el navegador pierde el botón de
 * baja, pero puede llamar — y es mejor eso que obligar a registrarse a alguien
 * que solo quiere ir a ayudar un sábado.
 */
export default function Apuntarse({
  inicial,
}: {
  inicial: ConvocatoriaPublica;
}) {
  const clave = `inscripcion:${inicial.id}`;

  const [convocatoria, setConvocatoria] = useState(inicial);
  const [token, setToken] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem(clave));
  }, [clave]);

  const lleno =
    convocatoria.cupo !== null && convocatoria.inscritos >= convocatoria.cupo;
  const termino = new Date(convocatoria.termina).getTime() < Date.now();
  const cancelada = convocatoria.estado === "cancelada";

  async function apuntarse(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/convocatorias/${convocatoria.id}/inscripciones`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nombre, telefono, nota: nota || null }),
        }
      );
      const datos = await res.json();
      if (!res.ok) {
        // Si el cupo se llenó mientras llenaba el formulario, hay que
        // refrescar el contador o la pantalla seguiría mintiendo.
        if (datos.convocatoria) setConvocatoria(datos.convocatoria);
        throw new Error(
          [datos.error, datos.detalle].filter(Boolean).join(". ") ||
            "No se pudo apuntar"
        );
      }
      localStorage.setItem(clave, datos.token);
      setToken(datos.token);
      setConvocatoria(datos.convocatoria);
      setAbierto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEnviando(false);
    }
  }

  async function cancelar() {
    if (!token) return;
    if (!confirm("¿Cancelar tu inscripción? Se libera tu cupo.")) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/convocatorias/${convocatoria.id}/inscripciones`,
        { method: "DELETE", headers: { "x-inscripcion-token": token } }
      );
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error ?? "No se pudo cancelar");
      localStorage.removeItem(clave);
      setToken(null);
      setConvocatoria(datos.convocatoria);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setEnviando(false);
    }
  }

  if (cancelada) {
    return (
      <p className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
        Esta convocatoria fue <strong>cancelada</strong> por quien la publicó.
      </p>
    );
  }

  if (termino) {
    return (
      <p className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
        Esta convocatoria ya terminó.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <Cupo c={convocatoria} />

      {error && (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {token ? (
        <div className="mt-4">
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <strong>Estás apuntado.</strong> Llega a la hora con lo que pidieron.
            Si no vas a poder, cancela para que otra persona ocupe tu lugar.
          </p>
          <button
            type="button"
            onClick={cancelar}
            disabled={enviando}
            className="mt-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {enviando ? "Cancelando…" : "Cancelar mi inscripción"}
          </button>
        </div>
      ) : lleno ? (
        <p className="mt-4 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700">
          El cupo está completo. Mira otras convocatorias: seguro hay más manos
          haciendo falta cerca.
        </p>
      ) : !abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="mt-4 w-full rounded-md bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 sm:w-auto"
        >
          Me apunto
        </button>
      ) : (
        <form onSubmit={apuntarse} className="mt-4 space-y-3">
          <p className="text-xs text-slate-600">
            Tus datos los ve <strong>solo quien organiza</strong>, para poder
            llamarte. No se publican en ningún lado. Al apuntarte asumes los
            riesgos de la actividad: este sitio publica la convocatoria pero no
            la organiza ni la supervisa.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Tu nombre *
              </span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                required
                minLength={2}
                maxLength={120}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Teléfono *
              </span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                required
                inputMode="tel"
                minLength={7}
                maxLength={40}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              ¿Algo que deban saber? (opcional)
            </span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              maxLength={200}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Llevo camioneta · soy enfermera · puedo ir solo en la mañana"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {enviando ? "Confirmando…" : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-md border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
