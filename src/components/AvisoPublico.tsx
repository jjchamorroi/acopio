import Link from "next/link";

/**
 * Letrero de "esto va a quedar visible para cualquiera".
 *
 * Está en un componente y no escrito a mano en cada formulario para que el
 * aviso no se contradiga entre pantallas: si en un sitio dice "el teléfono es
 * público" y en otro no dice nada, la persona asume lo que le conviene y
 * después aparece un número donde no debía.
 *
 * Va SIEMPRE junto a los campos que publica, no al final del formulario:
 * un aviso que se lee después de haber escrito el dato llega tarde.
 */
export default function AvisoPublico({
  campos,
  children,
}: {
  /** Qué queda visible, en palabras de la persona: "el teléfono", "la dirección". */
  campos: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
      <p>
        <span aria-hidden>👁</span>{" "}
        <strong>{campos} se publica en internet</strong> y cualquiera puede
        verlo, copiarlo o compartirlo. Usá datos institucionales, no personales.
      </p>
      {children && <p className="mt-1">{children}</p>}
      <p className="mt-1">
        Podés corregirlo o retirarlo cuando quieras con el enlace privado que
        recibís al terminar.{" "}
        <Link href="/aviso" className="font-medium underline">
          Aviso legal
        </Link>
      </p>
    </div>
  );
}
