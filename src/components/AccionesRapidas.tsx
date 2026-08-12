import Link from "next/link";
import type { ModoId } from "@/lib/tipos-lugar";

/**
 * Del rediseño, nota 01: «Las cuatro tarjetas de entrada pesan lo mismo, así
 * que ninguna guía».
 *
 * Ahora hay dos acciones dominantes —por donde entra casi todo el tráfico— y
 * el resto como enlaces secundarios. Que todo pese igual no es neutralidad:
 * es dejar sin ayuda a alguien que llegó con afán.
 */
export default function AccionesRapidas({ modo }: { modo?: ModoId }) {
  const enAyuda = modo === "ayuda";

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-[var(--color-marino)]">
        <Link href="/?modo=voluntarios" className="underline underline-offset-[3px]">
          Ser voluntario
        </Link>
        <Link href="/profesionales" className="underline underline-offset-[3px]">
          Atención profesional gratuita
        </Link>
        <Link href="/registrar" className="underline underline-offset-[3px]">
          Registrar un lugar
        </Link>
      </div>
    </div>
  );
}
