import Link from "next/link";
import { urlImagenNoticia, type NoticiaPublica } from "@/lib/tipos";

/**
 * Avisos de la portada.
 *
 * Para lo que el mapa no puede decir porque no es un lugar: "el sábado hay
 * jornada", "cambió el punto de entrega", "no lleven más ropa por ahora".
 *
 * Va ARRIBA del mapa y no debajo. Un aviso que hay que buscar no es un aviso.
 * Pero se limita a lo que quepa sin empujar el mapa fuera de la primera
 * pantalla en un teléfono: el mapa sigue siendo la razón por la que la gente
 * entra, y si desaparece bajo cuatro banners el sitio deja de servir.
 */
export default function Noticias({
  noticias,
}: {
  noticias: NoticiaPublica[];
}) {
  if (noticias.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-label="Avisos">
      {noticias.map((n) => {
        const contenido = (
          <>
            {n.tiene_imagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlImagenNoticia(n)}
                alt=""
                className="h-40 w-full shrink-0 rounded-xl object-cover sm:h-auto sm:w-44"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              {n.urgente && (
                <span className="mb-1 inline-block rounded-md bg-[var(--color-urgente-texto)] px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-white">
                  URGENTE
                </span>
              )}
              <h3
                className={`text-[17px] font-extrabold leading-tight tracking-tight ${
                  n.urgente ? "text-[#8f2418]" : ""
                }`}
              >
                {n.titulo}
              </h3>
              {n.cuerpo && (
                <p className="mt-1 whitespace-pre-line text-[14px] leading-snug text-[var(--color-apagado)]">
                  {n.cuerpo}
                </p>
              )}
              {n.enlace && (
                <span className="mt-2 inline-block text-[14px] font-bold text-[var(--color-marino)]">
                  {n.enlace_texto || "Ver más"} →
                </span>
              )}
            </div>
          </>
        );

        const clases = `flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-start ${
          n.urgente
            ? "border-[1.5px] border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)]"
            : "border-[var(--color-borde)] bg-white"
        } ${n.enlace ? "transition hover:border-[var(--color-borde-fuerte)]" : ""}`;

        if (!n.enlace) {
          return (
            <article key={n.id} className={clases}>
              {contenido}
            </article>
          );
        }

        // Un enlace externo se abre aparte y se marca como tal; uno interno
        // navega dentro del sitio sin recargar.
        const externo = /^https?:\/\//i.test(n.enlace);
        return externo ? (
          <a
            key={n.id}
            href={n.enlace}
            target="_blank"
            rel="noreferrer noopener"
            className={clases}
          >
            {contenido}
          </a>
        ) : (
          <Link key={n.id} href={n.enlace} className={clases}>
            {contenido}
          </Link>
        );
      })}
    </section>
  );
}
