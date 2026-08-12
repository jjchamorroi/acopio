import Link from "next/link";
import type { ConvocatoriaPublica } from "@/lib/tipos";

/** "mañana 6:00 a.m. – 2:00 p.m." en hora de Colombia. */
export function formatearFranja(inicia: string, termina: string) {
  const zona = "America/Bogota";
  const i = new Date(inicia);
  const f = new Date(termina);

  const dia = i.toLocaleDateString("es-CO", {
    timeZone: zona,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hora = (d: Date) =>
    d.toLocaleTimeString("es-CO", {
      timeZone: zona,
      hour: "numeric",
      minute: "2-digit",
    });

  const hoy = new Date().toLocaleDateString("es-CO", { timeZone: zona });
  const cuando = i.toLocaleDateString("es-CO", { timeZone: zona });
  const manana = new Date(Date.now() + 86_400_000).toLocaleDateString("es-CO", {
    timeZone: zona,
  });

  // "Hoy" y "mañana" se leen más rápido que "martes 12 de agosto", y en una
  // emergencia lo que importa es si hay que salir ya o no.
  const etiqueta =
    cuando === hoy ? "Hoy" : cuando === manana ? "Mañana" : dia;

  return `${etiqueta}, ${hora(i)} – ${hora(f)}`;
}

export function Cupo({ c }: { c: ConvocatoriaPublica }) {
  if (c.cupo === null) {
    return (
      <span className="text-sm text-slate-600">
        {c.inscritos} {c.inscritos === 1 ? "persona apuntada" : "personas apuntadas"}
      </span>
    );
  }

  const faltan = Math.max(0, c.cupo - c.inscritos);
  const lleno = faltan === 0;
  const pct = Math.min(100, Math.round((c.inscritos / c.cupo) * 100));

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between text-sm">
        <span className={lleno ? "font-medium text-slate-600" : "font-medium text-slate-900"}>
          {lleno ? "Cupo completo" : `Faltan ${faltan} de ${c.cupo}`}
        </span>
        <span className="text-xs text-slate-500">{c.inscritos} apuntados</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${lleno ? "bg-slate-400" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TarjetaConvocatoria({
  convocatoria: c,
}: {
  convocatoria: ConvocatoriaPublica;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-700">
            {formatearFranja(c.inicia, c.termina)}
          </p>
          <h3 className="font-semibold text-slate-900">
            <Link href={`/convocatoria/${c.id}`} className="hover:underline">
              {c.titulo}
            </Link>
          </h3>
          <p className="text-sm text-slate-600">{c.lugar_encuentro}</p>
          <p className="text-xs text-slate-500">
            {c.ciudad_nombre}, {c.departamento}
            {c.centro_nombre ? ` · ${c.centro_nombre}` : ""}
          </p>
        </div>

        {c.con_riesgo && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-300">
            ⚠ Trabajo con riesgo
          </span>
        )}
      </div>

      {c.es_demo && (
        <p className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
          Dato de prueba.
        </p>
      )}

      <p className="mt-2 line-clamp-2 text-sm text-slate-700">{c.descripcion}</p>

      {c.que_llevar && (
        <p className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <strong>Llevá:</strong> {c.que_llevar}
        </p>
      )}

      <div className="mt-3">
        <Cupo c={c} />
      </div>

      <Link
        href={`/convocatoria/${c.id}`}
        className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Ver y apuntarme
      </Link>
    </article>
  );
}
