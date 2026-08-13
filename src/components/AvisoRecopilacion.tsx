import Link from "next/link";

/**
 * "Esto se está armando sobre la marcha y hay que confirmarlo."
 *
 * Distinto de AvisoPublico, que le habla a quien ESCRIBE un dato. Este le
 * habla a quien lo LEE, y responde dos cosas que el sitio no decía:
 *
 *  - Que la lista está INCOMPLETA. Cada ficha marca si está verificada, pero
 *    ninguna podía decir "faltan lugares que no hemos encontrado". Alguien que
 *    no ve su municipio concluía que ahí no hay nada, cuando lo que pasa es
 *    que no lo hemos recopilado.
 *  - Que nada de esto reemplaza una llamada. La información viene de
 *    comunicados oficiales y de prensa, no de quien atiende el lugar, y en una
 *    emergencia un dato de ayer manda gente a donde ya no hace falta.
 *
 * Va arriba y no al pie: un aviso que se lee después de haber salido de la
 * casa llega tarde.
 */
export default function AvisoRecopilacion({
  className = "",
  compacto = false,
}: {
  className?: string;
  /** Una línea, para páginas que ya tienen mucho encabezado. */
  compacto?: boolean;
}) {
  if (compacto) {
    return (
      <p
        className={`rounded-xl border border-[var(--color-borde)] bg-[var(--color-hueso)] px-3.5 py-2.5 text-[12.5px] leading-snug text-[var(--color-apagado)] ${className}`}
      >
        <span aria-hidden>🛈</span>{" "}
        <strong className="text-[var(--color-tinta)]">
          Seguimos recopilando.
        </strong>{" "}
        La lista está incompleta y cambia todos los días.{" "}
        <strong className="text-[var(--color-tinta)]">
          Llama antes de desplazarte
        </strong>{" "}
        y confirma todo con la fuente oficial.{" "}
        <Link href="/aviso" className="underline">
          Aviso legal
        </Link>
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[var(--color-borde)] bg-[var(--color-hueso)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--color-apagado)] ${className}`}
    >
      <p>
        <span aria-hidden>🛈</span>{" "}
        <strong className="text-[var(--color-tinta)]">
          Esta información se está recopilando sobre la marcha.
        </strong>{" "}
        Sale de comunicados de alcaldías y gobernaciones, de organismos de
        socorro y de prensa —no de quien atiende cada lugar—, y{" "}
        <strong className="text-[var(--color-tinta)]">está incompleta</strong>:
        que tu municipio no aparezca no significa que ahí no haya nada, sino que
        todavía no lo hemos encontrado.
      </p>
      <p className="mt-1.5">
        <strong className="text-[var(--color-tinta)]">
          Verifica antes de actuar.
        </strong>{" "}
        Llama antes de desplazarte, y ante cualquier duda hazles caso a las
        autoridades y a los organismos de socorro antes que a este sitio. Cada
        ficha dice de dónde salió el dato para que puedas comprobarlo por tu
        cuenta.{" "}
        <Link href="/aviso" className="font-medium underline">
          Aviso legal
        </Link>
      </p>
    </div>
  );
}
