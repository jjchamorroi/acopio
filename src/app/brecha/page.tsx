import Link from "next/link";
import type { Metadata } from "next";
import { brechaAtencion, type BrechaMunicipio } from "@/lib/consultas";
import AvisoRecopilacion from "@/components/AvisoRecopilacion";

/**
 * Quién se está quedando por fuera.
 *
 * El resto del sitio responde "dónde hay ayuda". Esta página responde la
 * pregunta contraria, que es la que nadie está haciendo: dónde hubo daño y no
 * está llegando nadie.
 *
 * Hace falta porque un mapa de puntos no puede contestarla solo. En un mapa,
 * un municipio sin acopios se ve exactamente igual que un municipio sin daño:
 * vacío. Solo cruzando las dos capas —daño documentado contra puntos
 * registrados— la ausencia se vuelve visible.
 *
 * Los conteos de ayuda se calculan en vivo contra la base y no vienen
 * guardados. Es deliberado: la página tiene que dejar de denunciar un vacío en
 * cuanto alguien lo llene, o se convierte en una acusación falsa.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const b = await brechaAtencion();
    const sin = b.filter((m) => m.puntos === 0).length;
    const d = `De ${b.length} municipios con daño documentado, ${sin} no tienen un solo punto de acopio, albergue o atención registrado.`;
    return {
      title: "Quién se está quedando por fuera",
      description: d,
      openGraph: { title: "Quién se está quedando por fuera", description: d },
      twitter: { card: "summary_large_image", description: d },
    };
  } catch {
    return { title: "Quién se está quedando por fuera" };
  }
}

const numero = (n: number | null) =>
  n === null || n === undefined ? "—" : n.toLocaleString("es-CO");

function Etiqueta({
  children,
  tono = "gris",
}: {
  children: React.ReactNode;
  tono?: "rojo" | "gris" | "morado";
}) {
  const clases = {
    rojo: "bg-[var(--color-urgente-fondo)] text-[#8f2418] border-[var(--color-urgente-borde)]",
    gris: "bg-[var(--color-hueso)] text-[var(--color-apagado)] border-[var(--color-borde)]",
    morado: "bg-[#f3efff] text-[#5b3fa8] border-[#ddd2f7]",
  }[tono];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${clases}`}
    >
      {children}
    </span>
  );
}

function Fila({ m }: { m: BrechaMunicipio }) {
  const solo = m.puntos === 0;
  return (
    <article
      className={`rounded-2xl border p-4 ${
        solo
          ? "border-[1.5px] border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)]"
          : "border-[var(--color-borde)] bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[17px] font-extrabold tracking-tight">
            {m.nombre}
          </h3>
          <p className="text-[13px] text-[var(--color-apagado)]">
            {m.departamento}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`text-[22px] font-extrabold leading-none ${
              solo ? "text-[var(--color-urgente-texto)]" : ""
            }`}
          >
            {m.puntos}
          </div>
          <div className="text-[11px] font-semibold text-[var(--color-apagado)]">
            {m.puntos === 1 ? "punto de ayuda" : "puntos de ayuda"}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {m.incomunicado && <Etiqueta tono="rojo">🚧 Incomunicado</Etiqueta>}
        {m.etnico && <Etiqueta tono="morado">Territorio étnico</Etiqueta>}
        {m.albergues > 0 && (
          <Etiqueta>
            {m.albergues} {m.albergues === 1 ? "albergue" : "albergues"}
          </Etiqueta>
        )}
      </div>

      {(m.destruidas || m.averiadas || m.muertos || m.familias) && (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {m.destruidas ? (
            <div>
              <dt className="inline text-[var(--color-apagado)]">
                Viviendas destruidas{" "}
              </dt>
              <dd className="inline font-bold">{numero(m.destruidas)}</dd>
            </div>
          ) : null}
          {m.averiadas ? (
            <div>
              <dt className="inline text-[var(--color-apagado)]">Averiadas </dt>
              <dd className="inline font-bold">{numero(m.averiadas)}</dd>
            </div>
          ) : null}
          {m.muertos ? (
            <div>
              <dt className="inline text-[var(--color-apagado)]">
                Fallecidos{" "}
              </dt>
              <dd className="inline font-bold text-[var(--color-urgente-texto)]">
                {numero(m.muertos)}
              </dd>
            </div>
          ) : null}
          {m.familias ? (
            <div>
              <dt className="inline text-[var(--color-apagado)]">Familias </dt>
              <dd className="inline font-bold">{numero(m.familias)}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {m.nota && (
        <p className="mt-2 text-[13px] leading-snug text-[var(--color-apagado)]">
          {m.nota}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
        <Link
          href={`/?ciudad=${m.ciudad_slug}`}
          className="font-bold text-[var(--color-marino)] hover:underline"
        >
          Ver en el mapa →
        </Link>
        {m.puntos === 0 && (
          <Link
            href={`/registrar?ciudad=${m.ciudad_slug}`}
            className="font-bold text-[var(--color-marino)] hover:underline"
          >
            Registrar un lugar acá →
          </Link>
        )}
        {m.fuente && (
          <span className="text-[12px] text-[var(--color-tenue)]">
            según {m.fuente}
          </span>
        )}
      </div>
    </article>
  );
}

export default async function Brecha() {
  const brecha = await brechaAtencion();

  const sinNada = brecha.filter((m) => m.puntos === 0);
  const conDano = brecha.filter(
    (m) => m.destruidas || m.averiadas || m.muertos || m.familias
  );
  const criticos = brecha.filter(
    (m) =>
      m.puntos === 0 &&
      (m.destruidas || m.averiadas || m.muertos || m.familias)
  );
  const incomunicados = brecha.filter((m) => m.incomunicado);
  const totalPuntos = brecha.reduce((n, m) => n + m.puntos, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-etiqueta)]">
        Sismo del 10 de agosto de 2026
      </p>
      <h1 className="mt-2 text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-[40px]">
        Quién se está quedando por fuera
      </h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-snug text-[var(--color-apagado)]">
        El resto del sitio dice <strong>dónde hay ayuda</strong>. Esta página
        dice lo contrario:{" "}
        <strong className="text-[var(--color-tinta)]">
          dónde hubo daño y no está llegando nadie
        </strong>
        . En un mapa, un municipio sin acopios se ve igual que un municipio sin
        daño — vacío. Cruzar las dos cosas es lo único que hace visible la
        diferencia.
      </p>

      <div className="chips-scroll -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-[150px] shrink-0 flex-col gap-1 rounded-2xl border-[1.5px] border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)] p-4">
          <span className="text-[34px] font-extrabold leading-none tracking-tight text-[var(--color-urgente-texto)]">
            {sinNada.length}
          </span>
          <span className="text-[13px] font-semibold leading-tight text-[#8f2418]">
            municipios sin un solo punto de ayuda
          </span>
        </div>
        <div className="flex min-w-[150px] shrink-0 flex-col gap-1 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-hueso)] p-4">
          <span className="text-[34px] font-extrabold leading-none tracking-tight">
            {brecha.length}
          </span>
          <span className="text-[13px] font-semibold leading-tight text-[var(--color-apagado)]">
            municipios con daño documentado
          </span>
        </div>
        <div className="flex min-w-[150px] shrink-0 flex-col gap-1 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-hueso)] p-4">
          <span className="text-[34px] font-extrabold leading-none tracking-tight">
            {incomunicados.length}
          </span>
          <span className="text-[13px] font-semibold leading-tight text-[var(--color-apagado)]">
            incomunicados por vías cortadas
          </span>
        </div>
        <div className="flex min-w-[150px] shrink-0 flex-col gap-1 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-hueso)] p-4">
          <span className="text-[34px] font-extrabold leading-none tracking-tight">
            {totalPuntos}
          </span>
          <span className="text-[13px] font-semibold leading-tight text-[var(--color-apagado)]">
            puntos registrados en total
          </span>
        </div>
      </div>

      <AvisoRecopilacion className="mt-5" compacto />

      <section className="mt-8">
        <h2 className="text-[22px] font-extrabold tracking-tight">
          Lo más grave: daño confirmado y cero atención
        </h2>
        <p className="mt-1 text-[15px] text-[var(--color-apagado)]">
          {criticos.length} municipios donde hay cifras de daño publicadas y no
          tenemos registrado <strong>ningún</strong> acopio, albergue ni punto
          de atención. Ordenados por gravedad.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {criticos.slice(0, 20).map((m) => (
            <Fila key={m.ciudad_slug} m={m} />
          ))}
        </div>
        {criticos.length > 20 && (
          <p className="mt-3 text-[13px] text-[var(--color-tenue)]">
            Y {criticos.length - 20} más en la lista completa de abajo.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight">
          Todos los municipios con daño documentado
        </h2>
        <p className="mt-1 text-[15px] text-[var(--color-apagado)]">
          {conDano.length} municipios con cifras publicadas, ordenados por
          gravedad. Los de fondo rojo no tienen ningún punto registrado.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {conDano.map((m) => (
            <Fila key={m.ciudad_slug} m={m} />
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-[var(--color-borde)] bg-white p-5">
        <h2 className="text-lg font-extrabold tracking-tight">
          Cómo se hizo, y qué no significa
        </h2>
        <div className="mt-2 space-y-2.5 text-[14px] leading-relaxed text-[var(--color-apagado)]">
          <p>
            El <strong>daño</strong> viene de alcaldías, gobernaciones, la
            UNGRD, la Defensoría del Pueblo y prensa local, municipio por
            municipio. Los <strong>puntos de ayuda</strong> son los que este
            sitio tiene registrados, y se cuentan{" "}
            <strong className="text-[var(--color-tinta)]">
              en el momento en que cargas esta página
            </strong>{" "}
            — no vienen congelados. Si alguien abre un acopio en un municipio de
            esta lista y lo registra, deja de aparecer en rojo.
          </p>
          <p>
            <strong className="text-[var(--color-tinta)]">
              «Cero puntos» significa que nosotros no tenemos ninguno
              registrado, no que no exista ayuda.
            </strong>{" "}
            Puede haber una alcaldía trabajando sin haberlo publicado, o
            publicándolo por un canal que no hemos encontrado. La lista señala
            dónde mirar, no acusa a nadie.
          </p>
          <p>
            Lo que sí es real es el vacío de información: no existe una cifra
            oficial consolidada de cuántos alojamientos hay abiertos ni cuántas
            familias damnificadas. Las fuentes del Estado van de{" "}
            <strong>1.136 a 11.347</strong> viviendas destruidas según cuál se
            consulte.{" "}
            <Link href="/guia#s11" className="underline">
              Más sobre eso en la guía
            </Link>
            .
          </p>
        </div>
      </section>

      <Link
        href="/"
        className="mt-8 inline-block text-sm font-bold text-[var(--color-marino)] hover:underline"
      >
        ← Volver al mapa
      </Link>
    </div>
  );
}
