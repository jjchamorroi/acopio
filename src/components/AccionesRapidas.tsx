import Link from "next/link";
import type { ModoId } from "@/lib/tipos-lugar";

/**
 * Las cosas que se pueden hacer, a la vista.
 *
 * En celular la barra superior se colapsa en un botón "Menú", así que quien
 * entraba veía un mapa y ninguna pista de que también podía ofrecer lo que
 * tiene, convocar gente o pedir ayuda. Un mapa sin salidas visibles se lee
 * como una consulta, no como algo en lo que se participa.
 *
 * Van con verbos en primera persona —"tengo", "quiero", "necesito"— porque la
 * persona llega pensando desde su situación, no desde las categorías nuestras.
 *
 * Ninguna se pinta como "seleccionada". Justo encima hay un selector de dos
 * posiciones donde el relleno oscuro SÍ significa "estás acá"; usar el mismo
 * lenguaje para una simple sugerencia hacía creer que la opción de donar
 * venía activada de fábrica.
 */
const ACCIONES = [
  {
    href: "/donar",
    emoji: "🎁",
    titulo: "Tengo algo para donar",
    ayuda: "Te decimos quién lo necesita cerca",
    /** Modo del mapa que esta acción abre; si ya estás ahí, se oculta. */
    modo: null as ModoId | null,
  },
  {
    href: "/?modo=ayuda",
    emoji: "🆘",
    titulo: "Necesito ayuda",
    ayuda: "Comedores y albergues abiertos",
    modo: "ayuda" as ModoId,
  },
  {
    href: "/voluntarios",
    emoji: "🙋",
    titulo: "Quiero ser voluntario",
    ayuda: "Jornadas con cupo abierto",
    modo: null as ModoId | null,
  },
  {
    href: "/registrar",
    emoji: "📍",
    titulo: "Registrar un lugar",
    ayuda: "Acopio, albergue, comedor…",
    modo: null as ModoId | null,
  },
];

export default function AccionesRapidas({ modo }: { modo?: ModoId }) {
  // Ofrecerle "necesito ayuda" a quien ya está en necesito ayuda es ruido que
  // le quita sitio a las salidas que sí no ha visto.
  const visibles = ACCIONES.filter((a) => a.modo === null || a.modo !== modo);

  return (
    <nav aria-label="¿Qué querés hacer?" className="grid gap-2 sm:grid-cols-2">
      {visibles.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white p-4 transition hover:border-slate-400 hover:bg-slate-50"
        >
          <span aria-hidden className="text-2xl leading-none">
            {a.emoji}
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-slate-900">{a.titulo}</span>
            <span className="block text-xs text-slate-500">{a.ayuda}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
