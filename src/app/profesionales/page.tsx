import Link from "next/link";
import type { Metadata } from "next";
import TarjetaProfesional from "@/components/TarjetaProfesional";
import BotonCompartir from "@/components/BotonCompartir";
import { listarProfesionales } from "@/lib/consultas";
import { PROFESIONES, MODALIDADES } from "@/lib/profesiones";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const ps = await listarProfesionales({});
    const descripcion =
      ps.length === 0
        ? "Profesionales que ofrecen atención gratuita tras el sismo."
        : `${ps.length} profesionales ofrecen atención gratuita: psicología, medicina, enfermería y más.`;
    return {
      title: "Atención profesional gratuita",
      description: descripcion,
      openGraph: { title: "Atención profesional gratuita", description: descripcion },
      twitter: {
        card: "summary_large_image",
        title: "Atención profesional gratuita",
        description: descripcion,
      },
    };
  } catch {
    return { title: "Atención profesional gratuita" };
  }
}

export default async function Profesionales({
  searchParams,
}: {
  searchParams: Promise<{ profesion?: string; modalidad?: string }>;
}) {
  const { profesion, modalidad } = await searchParams;
  const profesionales = await listarProfesionales({ profesion, modalidad });

  // Solo se ofrecen los filtros de profesiones que alguien ejerce: una lista
  // de trece opciones donde doce están vacías solo genera callejones sin salida.
  const presentes = PROFESIONES.filter((p) =>
    profesionales.some((x) => x.profesion === p.id)
  );

  const enlace = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ profesion, modalidad, ...params })) {
      if (v) u.set(k, v);
    }
    const q = u.toString();
    return q ? `/profesionales?${q}` : "/profesionales";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Atención profesional gratuita
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Psicólogos, médicos, enfermeros y otros profesionales que ofrecen su
            trabajo sin cobrar tras el sismo.
          </p>
        </div>
        <Link
          href="/ofrecer-servicio"
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Ofrecer mis servicios
        </Link>
      </div>

      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Verifica antes de confiar.</strong> Este sitio no comprueba
        títulos ni registros: publicamos el número que cada persona informa para
        que tú lo consultes en el registro oficial. En salud, atender sin serlo
        hace daño real — desconfía de quien no publique su registro.
      </div>

      {profesionales.length > 0 && (
        <>
          <div className="mt-5 flex flex-wrap gap-1.5">
            <Link
              href={enlace({ profesion: undefined })}
              className={`rounded-full px-3 py-1.5 text-xs ring-1 ring-inset transition ${
                !profesion
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              Todas
            </Link>
            {presentes.map((p) => (
              <Link
                key={p.id}
                href={enlace({ profesion: p.id })}
                className={`rounded-full px-3 py-1.5 text-xs ring-1 ring-inset transition ${
                  profesion === p.id
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                <span aria-hidden>{p.emoji}</span> {p.label}
              </Link>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["presencial", "remoto"] as const).map((m) => (
              <Link
                key={m}
                href={enlace({ modalidad: modalidad === m ? undefined : m })}
                className={`rounded-full px-3 py-1.5 text-xs ring-1 ring-inset transition ${
                  modalidad === m
                    ? "bg-slate-700 text-white ring-slate-700"
                    : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                {MODALIDADES[m].label}
              </Link>
            ))}
          </div>

          <p className="mt-4 text-sm text-slate-600">
            <strong className="text-slate-900">{profesionales.length}</strong>{" "}
            {profesionales.length === 1 ? "profesional" : "profesionales"}
          </p>

          <BotonCompartir
            className="mt-3"
            texto="Profesionales ofreciendo atención gratuita tras el sismo: psicología, medicina, enfermería y más."
          />
        </>
      )}

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {profesionales.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center sm:col-span-2">
            <p className="text-slate-600">
              Todavía no hay profesionales registrados{profesion ? " en esa área" : ""}.
            </p>
            <Link
              href="/ofrecer-servicio"
              className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Ofrecer mis servicios
            </Link>
          </div>
        ) : (
          profesionales.map((p) => (
            <TarjetaProfesional key={p.id} profesional={p} />
          ))
        )}
      </section>
    </div>
  );
}
