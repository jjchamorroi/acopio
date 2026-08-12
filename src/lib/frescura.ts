/**
 * "hace 20 min", "hace 3 h", "hace 2 días".
 *
 * Del rediseño, nota 06: «"Confirmado hace 20 min" vale más que "Verificado"».
 * Y es cierto — el sello dice que alguien llamó alguna vez; la frescura dice
 * si el dato sirve HOY. Un acopio verificado hace tres días puede llevar dos
 * cerrado.
 */
export function haceCuanto(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);

  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;

  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;

  const meses = Math.floor(dias / 30);
  return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
}

/**
 * Qué tan confiable es el dato por su edad. El color acompaña al texto para
 * que se lea de un vistazo sin tener que hacer la cuenta mental.
 */
export function frescura(iso: string): {
  texto: string;
  clase: string;
  viejo: boolean;
} {
  const horas = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  return {
    texto: haceCuanto(iso),
    clase:
      horas < 12
        ? "text-[var(--color-abierto)]"
        : horas < 48
          ? "text-[var(--color-tenue)]"
          : "text-[var(--color-urgente-texto)]",
    viejo: horas >= 48,
  };
}

/**
 * Si el lugar está atendiendo ahora, deducido del texto libre de horario.
 *
 * Devuelve null cuando no se puede saber, que es lo honesto: el horario lo
 * escribe cada quien a mano ("24 horas", "8am a 6pm", "de lunes a viernes") y
 * adivinar mal es peor que no decir nada — manda a alguien a una puerta
 * cerrada con la confianza de que estaba abierta.
 */
export function estaAbierto(horario: string | null): boolean | null {
  if (!horario) return null;

  const h = horario.toLowerCase();
  if (/24\s*h|24\/7|todo el d[ií]a|permanente/.test(h)) return true;

  // "8:00 a.m. - 6:00 p.m." y variantes. Sin dos horas claras, no opinamos.
  const horas = [...h.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m|p\.?\s*m|am|pm|h)?/g)];
  if (horas.length < 2) return null;

  const aMinutos = (m: RegExpMatchArray) => {
    let hora = Number(m[1]);
    const min = Number(m[2] ?? 0);
    const sufijo = (m[3] ?? "").replace(/[.\s]/g, "");
    if (sufijo.startsWith("p") && hora < 12) hora += 12;
    if (sufijo.startsWith("a") && hora === 12) hora = 0;
    return hora * 60 + min;
  };

  const abre = aMinutos(horas[0]);
  const cierra = aMinutos(horas[1]);
  if (Number.isNaN(abre) || Number.isNaN(cierra) || abre === cierra) return null;

  const ahora = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })
  );
  const m = ahora.getHours() * 60 + ahora.getMinutes();

  // Horarios que cruzan la medianoche ("8pm a 6am").
  return cierra < abre ? m >= abre || m < cierra : m >= abre && m < cierra;
}
