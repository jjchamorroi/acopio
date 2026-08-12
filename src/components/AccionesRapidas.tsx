import Link from "next/link";
import EnlaceMascotas from "@/components/EnlaceMascotas";
import type { ModoId } from "@/lib/tipos-lugar";

/**
 * Del rediseño, nota 01: las cuatro tarjetas pesaban lo mismo, así que ninguna
 * guiaba. Pero convertir las secundarias en enlaces de texto se llevó por
 * delante los íconos, que son lo que hace la pantalla legible de un vistazo.
 *
 * La jerarquía la dan el tamaño y el color, no la existencia del ícono: dos
 * tarjetas grandes y de color para lo que hace el 90 % de la gente, y tres
 * pequeñas —con su ícono— para el resto.
 */

const SECUNDARIAS = [
  {
    href: "/?modo=voluntarios",
    emoji: "🙋",
    titulo: "Ser voluntario",
    modo: "voluntarios" as ModoId,
  },
  {
    href: "/profesionales",
    emoji: "🩺",
    titulo: "Necesito atención en salud",
    // Salud es lo que busca casi todo el mundo, así que encabeza el texto.
    // Quien necesita un ingeniero para su casa lo encuentra al entrar.
    modo: null as ModoId | null,
  },
  {
    href: "/registrar",
    emoji: "📍",
    titulo: "Registrar un lugar",
    modo: null as ModoId | null,
  },
];

export default function AccionesRapidas({ modo }: { modo?: ModoId }) {
  const enAyuda = modo === "ayuda";
  const secundarias = SECUNDARIAS.filter(
    (a) => a.modo === null || a.modo !== modo
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Link
          href="/donar"
          className="flex items-center gap-3.5 rounded-2xl bg-[var(--color-marino)] p-4 text-white transition hover:bg-[var(--color-marino-oscuro)]"
        >
          <span aria-hidden className="text-2xl leading-none">
            🎁
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold">
              Tengo algo para donar
            </span>
            <span className="block text-[13px] text-[var(--color-marino-tenue)]">
              Te decimos quién lo necesita cerca
            </span>
          </span>
        </Link>

        {!enAyuda && (
          <Link
            href="/?modo=ayuda"
            className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-[#f0c4bc] bg-[var(--color-urgente-fondo)] p-4 transition hover:brightness-[0.98]"
          >
            <span aria-hidden className="text-2xl leading-none">
              🆘
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold text-[#8f2418]">
                Necesito ayuda
              </span>
              <span className="block text-[13px] text-[#9a5a4e]">
                Comedores y albergues abiertos ahora
              </span>
            </span>
          </Link>
        )}
      </div>

      {/* Se arrastran de lado en móvil: cuatro tarjetas apiladas empujarían el
          mapa fuera de la primera pantalla.

          En pantalla ancha se reparten con flex y no con grid de N columnas:
          cuántas hay depende del modo —y desde que existe el enlace a Ubica tu
          Peludo son tres o cuatro—, así que un grid fijo dejaba un hueco. */}
      <div className="chips-scroll -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {secundarias.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex min-w-[168px] shrink-0 items-center gap-2.5 rounded-xl border border-[var(--color-borde)] bg-white px-3.5 py-3 transition hover:border-[var(--color-borde-fuerte)] hover:bg-[var(--color-hueso)] sm:flex-1 sm:shrink"
          >
            <span aria-hidden className="text-xl leading-none">
              {a.emoji}
            </span>
            <span className="text-[13.5px] font-bold leading-tight">
              {a.titulo}
            </span>
          </Link>
        ))}
        <EnlaceMascotas compacto />
      </div>
    </div>
  );
}
