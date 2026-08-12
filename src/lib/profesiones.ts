/**
 * Profesiones que pueden ofrecerse. Lista cerrada por la misma razón que las
 * categorías de donación: para poder filtrar. Alguien buscando "psicólogo" no
 * puede depender de que la otra persona haya escrito "psicologa" o "salud
 * mental".
 *
 * `registroObligatorio` marca las que ejercen sobre la salud de alguien. En
 * esas, publicar el número de tarjeta no es burocracia: es lo único que
 * permite a un tercero comprobar que quien se ofrece es quien dice ser.
 */
export const PROFESIONES = [
  {
    id: "psicologia",
    grupo: "salud" as const,
    label: "Psicología",
    emoji: "🧠",
    registroObligatorio: true,
    registroNombre: "Tarjeta profesional (Ley 1090)",
  },
  {
    id: "medicina",
    grupo: "salud" as const,
    label: "Medicina general",
    emoji: "🩺",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "medicina_especializada",
    grupo: "salud" as const,
    label: "Medicina especializada",
    emoji: "🏥",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "psiquiatria",
    grupo: "salud" as const,
    label: "Psiquiatría",
    emoji: "💊",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "enfermeria",
    grupo: "salud" as const,
    label: "Enfermería",
    emoji: "💉",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "fisioterapia",
    grupo: "salud" as const,
    label: "Fisioterapia",
    emoji: "🦵",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "odontologia",
    grupo: "salud" as const,
    label: "Odontología",
    emoji: "🦷",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "nutricion",
    grupo: "salud" as const,
    label: "Nutrición",
    emoji: "🥗",
    registroObligatorio: true,
    registroNombre: "Registro ReTHUS",
  },
  {
    id: "veterinaria",
    grupo: "salud" as const,
    label: "Veterinaria",
    emoji: "🐾",
    registroObligatorio: true,
    registroNombre: "Tarjeta profesional",
  },
  {
    id: "trabajo_social",
    grupo: "otra" as const,
    label: "Trabajo social",
    emoji: "🤝",
    registroObligatorio: false,
    registroNombre: "Tarjeta profesional",
  },
  {
    id: "juridica",
    grupo: "otra" as const,
    label: "Asesoría jurídica",
    emoji: "⚖️",
    registroObligatorio: false,
    registroNombre: "Tarjeta profesional",
  },
  {
    id: "ingenieria",
    grupo: "otra" as const,
    label: "Ingeniería o arquitectura",
    emoji: "🏗️",
    registroObligatorio: false,
    registroNombre: "Matrícula profesional",
  },
  {
    id: "otra",
    grupo: "otra" as const,
    label: "Otra",
    emoji: "🧰",
    registroObligatorio: false,
    registroNombre: "Registro o matrícula",
  },
] as const;

export type ProfesionId = (typeof PROFESIONES)[number]["id"];

/**
 * "Profesionales" a secas no dice nada: puede ser cualquier cosa. La mayoría
 * de lo que hace falta tras un sismo es SALUD —y sobre todo salud mental— así
 * que el directorio se presenta como tal, con las demás áreas aparte.
 */
export const PROFESIONES_SALUD = PROFESIONES.filter((p) => p.grupo === "salud");
export const PROFESIONES_OTRAS = PROFESIONES.filter((p) => p.grupo === "otra");
export const PROFESION_IDS = PROFESIONES.map((p) => p.id) as string[];

export function profesion(id: string) {
  return PROFESIONES.find((p) => p.id === id);
}

export const MODALIDADES = {
  presencial: { label: "Presencial", ayuda: "Atiende en persona" },
  remoto: { label: "Remoto", ayuda: "Por teléfono o videollamada" },
  ambas: { label: "Presencial y remoto", ayuda: "Las dos formas" },
} as const;

export type ModalidadId = keyof typeof MODALIDADES;
export const MODALIDAD_IDS = Object.keys(MODALIDADES) as ModalidadId[];
