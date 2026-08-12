/**
 * Líneas oficiales nacionales.
 *
 * Existen porque el directorio de profesionales depende de que alguien se
 * haya registrado, y estas atienden siempre. Alguien que entra a las 3 a.m.
 * buscando ayuda psicológica y encuentra la sección vacía se va con las manos
 * llenas si al menos tiene un número al que llamar.
 *
 * Solo van números VERIFICADOS contra fuentes oficiales. Cruz Roja, Defensa
 * Civil y bomberos no tienen línea nacional propia: el 123 los enruta, y
 * publicar un número plausible pero inventado en una emergencia es peor que
 * no publicar nada.
 */
const LINEAS = [
  {
    numero: "123",
    titulo: "Emergencias",
    detalle:
      "Línea única nacional, 24 horas. Enruta a policía, bomberos, Defensa Civil y ambulancias.",
    urgente: true,
  },
  {
    numero: "141",
    titulo: "Niñas, niños y adolescentes",
    detalle:
      "ICBF. Maltrato, abuso, trabajo infantil o un menor en riesgo. Gratuita, 24 horas.",
  },
  {
    numero: "155",
    titulo: "Mujeres víctimas de violencia",
    detalle:
      "Orientación nacional. No recibe denuncias ni atiende emergencias: para eso, el 123.",
  },
  {
    numero: "018000112137",
    titulo: "Línea Púrpura",
    detalle: "Apoyo psicológico y jurídico para mujeres.",
  },
  {
    numero: "018000916012",
    titulo: "Toxicología",
    detalle: "Intoxicaciones y exposición a sustancias tóxicas.",
  },
  {
    numero: "018000112439",
    titulo: "Línea Psicoactiva",
    detalle: "Orientación sobre consumo de sustancias.",
  },
];

export default function ContactosUtiles({
  titulo = "Contactos útiles",
  intro,
}: {
  titulo?: string;
  intro?: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-borde)] bg-white p-5">
      <h2 className="text-lg font-extrabold tracking-tight">☎️ {titulo}</h2>
      <p className="mt-0.5 text-[13.5px] text-[var(--color-apagado)]">
        {intro ??
          "Líneas oficiales nacionales, gratuitas y siempre disponibles. No dependen de este sitio."}
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {LINEAS.map((l) => (
          <li key={l.numero}>
            <a
              href={`tel:${l.numero}`}
              className={`flex h-full items-start gap-3 rounded-xl border p-3 transition ${
                l.urgente
                  ? "border-[var(--color-urgente-borde)] bg-[var(--color-urgente-fondo)] hover:brightness-[0.98]"
                  : "border-[var(--color-borde)] bg-[var(--color-hueso)] hover:bg-white"
              }`}
            >
              <span
                className={`shrink-0 font-extrabold tracking-tight ${
                  l.urgente
                    ? "text-[22px] text-[var(--color-urgente-texto)]"
                    : "text-[15px] text-[var(--color-marino)]"
                }`}
              >
                {l.numero}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[14px] font-bold ${
                    l.urgente ? "text-[#8f2418]" : ""
                  }`}
                >
                  {l.titulo}
                </span>
                <span className="block text-[12.5px] leading-snug text-[var(--color-apagado)]">
                  {l.detalle}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
