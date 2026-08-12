import Link from "next/link";

/**
 * Las cuatro cosas que se pueden hacer, a la vista.
 *
 * En celular la barra superior se colapsa en un botón "Menú", así que quien
 * entraba veía un mapa y ninguna pista de que también podía ofrecer lo que
 * tiene, convocar gente o pedir ayuda. Un mapa sin salidas visibles se lee
 * como una consulta, no como algo en lo que se participa.
 *
 * Van con verbos en primera persona —"tengo", "quiero", "necesito"— porque la
 * persona llega pensando desde su situación, no desde las categorías nuestras.
 */
const ACCIONES = [
  {
    href: "/donar",
    emoji: "🎁",
    titulo: "Tengo algo para donar",
    ayuda: "Te decimos quién lo necesita cerca",
    destacado: true,
  },
  {
    href: "/?modo=ayuda",
    emoji: "🆘",
    titulo: "Necesito ayuda",
    ayuda: "Comedores y albergues abiertos",
  },
  {
    href: "/voluntarios",
    emoji: "🙋",
    titulo: "Quiero ser voluntario",
    ayuda: "Jornadas con cupo abierto",
  },
  {
    href: "/registrar",
    emoji: "📍",
    titulo: "Registrar un lugar",
    ayuda: "Acopio, albergue, comedor…",
  },
];

export default function AccionesRapidas() {
  return (
    <nav aria-label="¿Qué querés hacer?" className="grid gap-2 sm:grid-cols-2">
      {ACCIONES.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`flex items-center gap-3 rounded-lg border p-4 transition ${
            a.destacado
              ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
              : "border-slate-300 bg-white hover:bg-slate-50"
          }`}
        >
          <span aria-hidden className="text-2xl leading-none">
            {a.emoji}
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{a.titulo}</span>
            <span
              className={`block text-xs ${a.destacado ? "text-slate-300" : "text-slate-500"}`}
            >
              {a.ayuda}
            </span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
