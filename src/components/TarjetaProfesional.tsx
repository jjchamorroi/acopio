import { profesion as buscarProfesion, MODALIDADES } from "@/lib/profesiones";
import type { ProfesionalPublico } from "@/lib/tipos";

export default function TarjetaProfesional({
  profesional: p,
}: {
  profesional: ProfesionalPublico;
}) {
  const prof = buscarProfesion(p.profesion);
  const modalidad = MODALIDADES[p.modalidad];
  const sinCanal = !p.telefono && !p.email;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            <span aria-hidden>{prof?.emoji}</span> {prof?.label ?? p.profesion}
          </span>
          <h3 className="mt-1.5 font-semibold text-slate-900">{p.nombre}</h3>
          <p className="text-xs text-slate-500">
            {modalidad.label}
            {p.ciudad_nombre ? ` · ${p.ciudad_nombre}` : ""}
            {p.disponibilidad ? ` · ${p.disponibilidad}` : ""}
          </p>
        </div>

        {p.estado === "verificado" ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
            ✓ Verificado
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
            Sin verificar
          </span>
        )}
      </div>

      {p.es_demo && (
        <p className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
          Dato de prueba — esta persona no existe.
        </p>
      )}

      <p className="mt-2 text-sm text-slate-700">{p.descripcion}</p>

      {/* El registro se publica para que cualquiera pueda comprobarlo por su
          cuenta. Es la diferencia entre "confíen en mí" y algo verificable. */}
      {p.registro ? (
        <p className="mt-2 text-xs text-slate-600">
          <strong>Registro profesional:</strong>{" "}
          <span className="font-mono">{p.registro}</span>
          <span className="mt-0.5 block text-slate-500">
            Podés verificarlo en el registro oficial antes de contactar.
          </span>
        </p>
      ) : (
        <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
          No informó número de registro profesional.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {p.telefono && (
          <a
            href={`tel:${p.telefono.replace(/\s/g, "")}`}
            className="font-medium text-blue-700 hover:underline"
          >
            Llamar {p.telefono}
          </a>
        )}
        {p.email && (
          <a
            href={`mailto:${p.email}`}
            className="font-medium text-blue-700 hover:underline"
          >
            Escribir a {p.email}
          </a>
        )}
        {sinCanal && (
          <span className="text-xs text-slate-500">
            Pidió no publicar sus datos de contacto.
          </span>
        )}
      </div>
    </article>
  );
}
