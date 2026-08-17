"use client";

import { useState } from "react";
import Link from "next/link";
import BotonInstagram from "@/components/BotonInstagram";
import { urlImagenNoticia, type NoticiaPublica } from "@/lib/tipos";

/**
 * Avisos de la portada.
 *
 * Para lo que el mapa no puede decir porque no es un lugar: "el sábado hay
 * jornada", "cambió el punto de entrega", "no lleven más ropa por ahora".
 *
 * Van ARRIBA del listado —un aviso que hay que buscar no es un aviso— pero
 * plegados salvo el primero. Con seis avisos abiertos la portada eran dos
 * pantallas de afiches antes de llegar al mapa, que es a lo que entra la
 * gente. Plegado se ve el titular de todos y se abre el que interese.
 *
 * Plegar además AHORRA DATOS, que es lo que de verdad importa aquí: la imagen
 * de un aviso cerrado no se pide. Seis afiches son ~700 KB, y buena parte de
 * quien entra está con datos móviles en zona afectada.
 */
export default function Noticias({ noticias }: { noticias: NoticiaPublica[] }) {
  // Abiertos de entrada: los urgentes y el primero. El resto, a un toque.
  const [abiertos, setAbiertos] = useState<Set<string>>(
    () => new Set(noticias.filter((n, i) => n.urgente || i === 0).map((n) => n.id))
  );

  if (noticias.length === 0) return null;

  const alternar = (id: string) =>
    setAbiertos((prev) => {
      const s = new Set(prev);
      if (!s.delete(id)) s.add(id);
      return s;
    });

  return (
    <section className="flex flex-col gap-2" aria-label="Avisos">
      {noticias.map((n) => (
        <Aviso
          key={n.id}
          noticia={n}
          abierto={abiertos.has(n.id)}
          alternar={() => alternar(n.id)}
        />
      ))}

      {/* Compartir los avisos como imagen. Va al pie de la lista y no arriba:
          primero se lee, después se reenvía. La imagen la arma el servidor con
          los mismos avisos, así que quien la comparte no tiene que resumir
          nada ni transcribir un afiche a un chat. */}
      <div className="flex justify-end pt-1">
        <BotonInstagram
          url="/api/imagen?v=avisos"
          nombre="red-de-acopio-avisos.png"
          etiqueta="Compartir avisos"
        />
      </div>
    </section>
  );
}

function Aviso({
  noticia: n,
  abierto,
  alternar,
}: {
  noticia: NoticiaPublica;
  abierto: boolean;
  alternar: () => void;
}) {
  const panel = `aviso-${n.id}`;

  return (
    <article
      className={`overflow-hidden rounded-2xl border ${
        n.urgente
          ? "border-[1.5px] border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)]"
          : "border-[var(--color-borde)] bg-white"
      }`}
    >
      <h3>
        <button
          type="button"
          onClick={alternar}
          aria-expanded={abierto}
          aria-controls={panel}
          className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-[var(--color-hueso)]"
        >
          {/* Miniatura, también con el aviso cerrado: una lista de puros
              títulos queda plana y no se distingue un aviso de otro de un
              vistazo. Es una imagen REDUCIDA en el servidor, no el afiche
              encogido con CSS — así el aviso plegado cuesta unos 4 KB en vez
              de 130 KB y el ahorro de datos se mantiene.

              Se encuadra por arriba: en un afiche vertical el titular está
              siempre en la parte de arriba, y un recorte centrado deja ver
              justo la parte que no dice nada. */}
          {n.tiene_imagen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlImagenNoticia(n, 160)}
              alt=""
              width={56}
              height={56}
              className="size-14 shrink-0 rounded-lg border border-[var(--color-borde)] bg-white object-cover object-top"
              loading="lazy"
            />
          )}
          <span className="min-w-0 flex-1">
            {n.urgente && (
              <span className="mb-1 mr-2 inline-block rounded-md bg-[var(--color-urgente-texto)] px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-white">
                URGENTE
              </span>
            )}
            <span
              className={`text-[16px] font-extrabold leading-tight tracking-tight ${
                n.urgente ? "text-[#8f2418]" : ""
              }`}
            >
              {n.titulo}
            </span>
          </span>
          {/* Marca de que hay algo debajo. Gira al abrir en vez de cambiar de
              icono, para que se lea como el mismo control moviéndose. */}
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 text-[var(--color-apagado)] transition-transform ${
              abierto ? "rotate-180" : ""
            }`}
          >
            <path
              d="M5 8l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </h3>

      {/* Cerrado no se monta: así el navegador NO pide la imagen. Ocultarla con
          CSS la descargaría igual y el ahorro de datos desaparecería. */}
      {abierto && (
        <div
          id={panel}
          className="flex flex-col gap-4 px-3 pb-4 sm:flex-row sm:items-start"
        >
          {/* Aquí sí el afiche entero y a tamaño de leerse: es lo que la
              persona acaba de pedir al abrir. `object-contain` porque
              recortarlo le quitaría justo el texto por el que es un afiche. */}
          {n.tiene_imagen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlImagenNoticia(n)}
              alt=""
              className="w-full shrink-0 rounded-xl border border-[var(--color-borde)] object-contain sm:w-60"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            {n.cuerpo && (
              <p className="whitespace-pre-line text-[14px] leading-snug text-[var(--color-apagado)]">
                {n.cuerpo}
              </p>
            )}
            {n.enlace && <EnlaceAviso noticia={n} />}
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * El enlace del aviso.
 *
 * Va suelto y no envolviendo la tarjeta entera: la cabecera ya es el botón que
 * pliega, y un enlace por fuera que se traga el clic haría que abrir el aviso
 * te sacara del sitio.
 */
function EnlaceAviso({ noticia: n }: { noticia: NoticiaPublica }) {
  const clases =
    "mt-2 inline-block text-[14px] font-bold text-[var(--color-marino)] underline underline-offset-2";
  const texto = n.enlace_texto || "Ver más";
  const enlace = n.enlace!;

  // `tel:` y `mailto:` los resuelve el teléfono, no el enrutador: tienen que
  // salir como <a> normal. Solo una ruta interna pasa por <Link>.
  if (/^(https?|tel|mailto):/i.test(enlace)) {
    const web = /^https?:/i.test(enlace);
    return (
      <a
        href={enlace}
        {...(web ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        className={clases}
      >
        {texto} →
      </a>
    );
  }
  return (
    <Link href={enlace} className={clases}>
      {texto} →
    </Link>
  );
}
