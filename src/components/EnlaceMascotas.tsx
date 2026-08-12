/**
 * Enlace a "Ubica tu Peludo", el sitio de mascotas perdidas por el sismo.
 *
 * No construimos lo mismo a propósito. Dos bases de datos de mascotas
 * perdidas a medio llenar son peores que una llena: alguien publica su perro
 * en un sitio y quien lo encuentra busca en el otro. Ellos ya tienen cientos
 * de reportes; duplicarlo dividiría justo la información que sirve.
 *
 * Va marcado como sitio ajeno —icono de enlace externo y una línea que lo
 * dice— para que nadie crea que es nuestro y para que el alcance de nuestro
 * aviso legal quede claro.
 */
const URL_PELUDOS = "https://encuentratupeludo.vercel.app/";

export default function EnlaceMascotas({
  compacto = false,
}: {
  /** Versión de una línea, para meter entre las acciones de la portada. */
  compacto?: boolean;
}) {
  if (compacto) {
    return (
      <a
        href={URL_PELUDOS}
        target="_blank"
        rel="noreferrer noopener"
        className="flex min-w-[168px] shrink-0 items-center gap-2.5 rounded-xl border border-[var(--color-borde)] bg-white px-3.5 py-3 transition hover:border-[var(--color-borde-fuerte)] hover:bg-[var(--color-hueso)] sm:flex-1 sm:shrink"
      >
        <span aria-hidden className="text-xl leading-none">
          🐾
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-bold leading-tight">
            Perdí a mi mascota
          </span>
          <span className="block text-[11.5px] leading-tight text-[var(--color-tenue)]">
            Ubica tu Peludo ↗
          </span>
        </span>
      </a>
    );
  }

  return (
    <a
      href={URL_PELUDOS}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-start gap-4 rounded-2xl border border-[var(--color-borde)] bg-white p-5 transition hover:border-[var(--color-borde-fuerte)] hover:bg-[var(--color-hueso)]"
    >
      <span aria-hidden className="text-3xl leading-none">
        🐾
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-extrabold tracking-tight">
            ¿Perdiste a tu mascota?
          </span>
          <span className="rounded-full bg-[var(--color-borde-suave)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-apagado)]">
            OTRO SITIO ↗
          </span>
        </span>
        <span className="mt-1 block text-[14px] leading-snug text-[var(--color-apagado)]">
          <strong className="text-[var(--color-tinta)]">Ubica tu Peludo</strong>{" "}
          es una plataforma hecha por otro equipo en Manizales para reunir
          mascotas con sus familias tras el sismo. Ahí se reportan perdidas,
          se buscan avistamientos y se coordina por WhatsApp.
        </span>
        <span className="mt-1.5 block text-[12.5px] text-[var(--color-tenue)]">
          No duplicamos lo que ya existe: si los reportes se reparten entre dos
          sitios, nadie encuentra nada.
        </span>
      </span>
    </a>
  );
}
