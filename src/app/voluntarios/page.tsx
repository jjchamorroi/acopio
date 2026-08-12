import Link from "next/link";
import type { Metadata } from "next";
import TarjetaConvocatoria from "@/components/TarjetaConvocatoria";
import BotonCompartir from "@/components/BotonCompartir";
import { listarConvocatorias } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const cs = await listarConvocatorias({});
    const plazas = cs.reduce(
      (n, c) => n + (c.cupo === null ? 0 : Math.max(0, c.cupo - c.inscritos)),
      0
    );
    const descripcion =
      cs.length === 0
        ? "Convocatorias abiertas para ir a ayudar tras el sismo."
        : `${cs.length} convocatorias abiertas${plazas > 0 ? ` · faltan ${plazas} personas` : ""}. Mira qué hay que hacer, cuándo y qué llevar.`;
    return {
      title: "Se necesitan voluntarios",
      description: descripcion,
      openGraph: { title: "Se necesitan voluntarios", description: descripcion },
      twitter: {
        card: "summary_large_image",
        title: "Se necesitan voluntarios",
        description: descripcion,
      },
    };
  } catch {
    return { title: "Se necesitan voluntarios" };
  }
}

export default async function Voluntarios({
  searchParams,
}: {
  searchParams: Promise<{ ciudad?: string }>;
}) {
  const { ciudad } = await searchParams;
  const convocatorias = await listarConvocatorias({ ciudad });

  const plazas = convocatorias.reduce(
    (n, c) => n + (c.cupo === null ? 0 : Math.max(0, c.cupo - c.inscritos)),
    0
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Se necesitan manos
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Convocatorias abiertas: qué hay que hacer, cuándo, dónde y qué
            llevar. Apúntate solo si vas a ir — el cupo que ocupas es el de
            otra persona.
          </p>
        </div>
        <Link
          href="/convocar"
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Convocar voluntarios
        </Link>
      </div>

      {convocatorias.length > 0 && (
        <>
          <p className="mt-4 text-sm text-slate-600">
            <strong className="text-slate-900">{convocatorias.length}</strong>{" "}
            {convocatorias.length === 1 ? "convocatoria abierta" : "convocatorias abiertas"}
            {plazas > 0 && (
              <>
                {" · "}
                <strong className="text-emerald-700">faltan {plazas} personas</strong>
              </>
            )}
          </p>
          <BotonCompartir
            className="mt-3"
            texto={
              plazas > 0
                ? `Faltan ${plazas} voluntarios para las jornadas de esta semana por el sismo. Mira qué hay que hacer y apúntate:`
                : "Convocatorias de voluntarios por el sismo. Mira qué hay que hacer:"
            }
          />
        </>
      )}

      <section className="mt-6 space-y-3">
        {convocatorias.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-600">
              No hay convocatorias abiertas en este momento.
            </p>
            <Link
              href="/convocar"
              className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Publicar la primera
            </Link>
          </div>
        ) : (
          convocatorias.map((c) => (
            <TarjetaConvocatoria key={c.id} convocatoria={c} />
          ))
        )}
      </section>
    </div>
  );
}
