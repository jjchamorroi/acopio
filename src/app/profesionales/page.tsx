import Link from "next/link";
import type { Metadata } from "next";
import TarjetaProfesional from "@/components/TarjetaProfesional";
import BotonCompartir from "@/components/BotonCompartir";
import ContactosUtiles from "@/components/ContactosUtiles";
import { listarProfesionales } from "@/lib/consultas";
import {
  PROFESIONES_SALUD,
  PROFESIONES_OTRAS,
  MODALIDADES,
} from "@/lib/profesiones";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const ps = await listarProfesionales({});
    const descripcion =
      ps.length === 0
        ? "Médicos, psicólogos, enfermeros e ingenieros que ayudan gratis tras el sismo."
        : `${ps.length} profesionales ayudan gratis: psicología, medicina, enfermería y revisión de viviendas.`;
    return {
      title: "Ayuda profesional gratuita",
      description: descripcion,
      openGraph: {
        title: "Ayuda profesional gratuita",
        description: descripcion,
      },
      twitter: {
        card: "summary_large_image",
        title: "Ayuda profesional gratuita",
        description: descripcion,
      },
    };
  } catch {
    return { title: "Ayuda profesional gratuita" };
  }
}

export default async function Profesionales({
  searchParams,
}: {
  searchParams: Promise<{ profesion?: string; modalidad?: string }>;
}) {
  const { profesion, modalidad } = await searchParams;
  const profesionales = await listarProfesionales({ profesion, modalidad });

  const idsSalud = new Set(PROFESIONES_SALUD.map((p) => p.id as string));
  const deSalud = profesionales.filter((p) => idsSalud.has(p.profesion));
  const otros = profesionales.filter((p) => !idsSalud.has(p.profesion));

  // Solo se ofrecen los filtros de profesiones que alguien ejerce: trece
  // opciones donde doce están vacías solo genera callejones sin salida.
  const presentes = [...PROFESIONES_SALUD, ...PROFESIONES_OTRAS].filter((p) =>
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

  const chip = (activo: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
      activo
        ? "bg-[var(--color-tinta)] text-white ring-[var(--color-tinta)]"
        : "bg-white text-[var(--color-tinta)] ring-[var(--color-borde-fuerte)] hover:bg-[var(--color-hueso)]"
    }`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight sm:text-[34px]">
            Ayuda profesional gratuita
          </h1>
          <p className="mt-2 max-w-2xl text-[17px] leading-snug text-[var(--color-apagado)]">
            Gente que atiende{" "}
            <strong className="text-[var(--color-tinta)]">sin cobrar</strong> a
            personas afectadas por el sismo.{" "}
            <strong className="text-[var(--color-tinta)]">
              Sobre todo salud
            </strong>{" "}
            —psicología, medicina, enfermería, veterinaria—, y también{" "}
            ingeniería y arquitectura para saber si una vivienda quedó
            habitable, asesoría jurídica y trabajo social.
          </p>
        </div>
        <Link
          href="/ofrecer-servicio"
          className="rounded-lg bg-[var(--color-tinta)] px-4 py-2.5 text-sm font-bold text-white hover:bg-black"
        >
          Ofrecer mi ayuda
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)] px-4 py-3 text-sm text-[#8f2418]">
        <strong>Verifica antes de confiar.</strong> Este sitio no comprueba
        títulos ni registros: publicamos el número que cada persona informa para
        que tú lo consultes en el registro oficial. En salud, atender sin serlo
        hace daño real — desconfía de quien no publique su registro.
      </div>

      {profesionales.length > 0 && (
        <>
          <p className="mt-5 text-sm text-[var(--color-apagado)]">
            <strong className="text-[var(--color-tinta)]">
              {profesionales.length}
            </strong>{" "}
            {profesionales.length === 1 ? "profesional" : "profesionales"}
            {deSalud.length > 0 && otros.length > 0
              ? ` · ${deSalud.length} de salud, ${otros.length} de otras áreas`
              : ""}
          </p>

          <BotonCompartir
            className="mt-3"
            texto="Profesionales que ayudan gratis tras el sismo: psicología, medicina, enfermería y revisión de viviendas."
          />

          <div className="chips-scroll -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4">
            <Link href={enlace({ profesion: undefined })} className={chip(!profesion)}>
              Todas
            </Link>
            {presentes.map((p) => (
              <Link
                key={p.id}
                href={enlace({ profesion: p.id })}
                className={chip(profesion === p.id)}
              >
                <span aria-hidden>{p.emoji}</span> {p.label}
              </Link>
            ))}
            {(["presencial", "remoto"] as const).map((m) => (
              <Link
                key={m}
                href={enlace({ modalidad: modalidad === m ? undefined : m })}
                className={chip(modalidad === m)}
              >
                {MODALIDADES[m].label}
              </Link>
            ))}
          </div>
        </>
      )}

      {profesionales.length === 0 ? (
        <>
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-borde-fuerte)] bg-white p-8 text-center">
            <p className="text-[var(--color-apagado)]">
              Todavía no hay profesionales registrados
              {profesion ? " en esa área" : ""}.
            </p>
            <Link
              href="/ofrecer-servicio"
              className="mt-3 inline-block rounded-lg bg-[var(--color-tinta)] px-4 py-2.5 text-sm font-bold text-white"
            >
              Ofrecer mi ayuda
            </Link>
          </div>

          {/* Con el directorio vacío, esto es lo único que de verdad sirve:
              alguien buscando ayuda a las 3 a.m. se va con un número al que
              llamar en vez de con una pantalla en blanco. */}
          <div className="mt-4">
            <ContactosUtiles
              intro="Mientras tanto, estas líneas oficiales atienden siempre y son gratuitas."
            />
          </div>
        </>
      ) : (
        <>
          {/*
            Salud va primero y con encabezado propio. La jerarquía la comunica
            el ORDEN, no el título de la página: así queda claro de qué va esto
            sin tener que esconder las demás áreas.
          */}
          {deSalud.length > 0 && (
            <section className="mt-7">
              <h2 className="text-lg font-extrabold tracking-tight">🩺 Salud</h2>
              <p className="mb-3 mt-0.5 text-[13.5px] text-[var(--color-apagado)]">
                Psicología, medicina, enfermería, veterinaria. Es lo que más
                falta en las semanas siguientes, cuando lo agudo ya pasó.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {deSalud.map((p) => (
                  <TarjetaProfesional key={p.id} profesional={p} />
                ))}
              </div>
            </section>
          )}

          {otros.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-extrabold tracking-tight">
                🏗️ Otras áreas
              </h2>
              <p className="mb-3 mt-0.5 text-[13.5px] text-[var(--color-apagado)]">
                Ingeniería y arquitectura para saber si una vivienda quedó
                habitable —una de las preguntas más frecuentes después de un
                sismo—, asesoría jurídica y trabajo social.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {otros.map((p) => (
                  <TarjetaProfesional key={p.id} profesional={p} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-8">
            <ContactosUtiles />
          </div>
        </>
      )}
    </div>
  );
}
